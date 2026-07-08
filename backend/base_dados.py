# ============================================================
# PROJETO JARVIS — Acesso à base de dados (Supabase)
#
# O backend fala com o Supabase por HTTPS através da API REST
# (PostgREST) usando a SERVICE KEY — que ignora o RLS e é a única
# com permissão de escrita. Usamos httpx diretamente (em vez de uma
# biblioteca extra) porque é simples, fiável e fácil de explicar.
#
# Também envia eventos Realtime (Broadcast) para a PWA atualizar
# sozinha: o backend "toca a campainha" no canal do dispositivo e
# a app vai buscar os dados por REST (sempre protegidos por RLS).
# ============================================================
import logging
from datetime import datetime, timezone

import httpx

import config

logger = logging.getLogger("jarvis.bd")

# Cabeçalhos de autenticação para todas as chamadas ao Supabase
def _cabecalhos() -> dict:
    return {
        "apikey": config.SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {config.SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
    }


def _url_rest(tabela: str) -> str:
    """URL da API REST do Supabase para uma tabela."""
    return f"{config.SUPABASE_URL}/rest/v1/{tabela}"


# ------------------------------------------------------------
# CONVERSAS
# ------------------------------------------------------------
def obter_historico(device_id: str, n_turnos: int) -> list[dict]:
    """Devolve os últimos n_turnos do dispositivo, do mais ANTIGO para o
    mais RECENTE (ordem correta para construir o prompt)."""
    resposta = httpx.get(
        _url_rest("conversations"),
        headers=_cabecalhos(),
        params={
            "device_id": f"eq.{device_id}",
            "select": "user_input,claude_response",
            "order": "timestamp.desc",   # mais recentes primeiro...
            "limit": str(n_turnos),
        },
        timeout=15,
    )
    resposta.raise_for_status()
    linhas = resposta.json()
    linhas.reverse()  # ...e invertemos para ficar do mais antigo para o mais recente
    return linhas


def gravar_conversa(
    device_id: str,
    session_id: str,
    user_input: str,
    claude_response: str,
    tokens_used: int,
    latency_ms: int,
    display_mode: str = "voice",
) -> dict:
    """Grava um turno completo (pergunta + resposta) e devolve a linha criada."""
    resposta = httpx.post(
        _url_rest("conversations"),
        headers={**_cabecalhos(), "Prefer": "return=representation"},
        json={
            "device_id": device_id,
            "session_id": session_id,
            "user_input": user_input,
            "claude_response": claude_response,
            "display_mode": display_mode,
            "tokens_used": tokens_used,
            "latency_ms": latency_ms,
        },
        timeout=15,
    )
    resposta.raise_for_status()
    return resposta.json()[0]


def obter_ultima_conversa(device_id: str) -> dict | None:
    """Devolve a última conversa do dispositivo (ou None se não existir)."""
    resposta = httpx.get(
        _url_rest("conversations"),
        headers=_cabecalhos(),
        params={
            "device_id": f"eq.{device_id}",
            "select": "*",
            "order": "timestamp.desc",
            "limit": "1",
        },
        timeout=15,
    )
    resposta.raise_for_status()
    linhas = resposta.json()
    return linhas[0] if linhas else None


def marcar_para_app(conversa_id: str) -> None:
    """Marca uma conversa com display_mode='app' (aparece na vista de leitura da PWA)."""
    resposta = httpx.patch(
        _url_rest("conversations"),
        headers=_cabecalhos(),
        params={"id": f"eq.{conversa_id}"},
        json={"display_mode": "app"},
        timeout=15,
    )
    resposta.raise_for_status()


# ------------------------------------------------------------
# SESSÕES — estatísticas por sessão de utilização
# ------------------------------------------------------------
def atualizar_sessao(session_id: str, device_id: str) -> None:
    """Cria a sessão na primeira mensagem; nas seguintes incrementa o
    contador e atualiza a hora da última atividade (ended_at)."""
    # Procura a sessão
    resposta = httpx.get(
        _url_rest("sessions"),
        headers=_cabecalhos(),
        params={"id": f"eq.{session_id}", "select": "id,total_messages"},
        timeout=15,
    )
    resposta.raise_for_status()
    linhas = resposta.json()

    if not linhas:
        # Primeira mensagem desta sessão — cria a linha
        httpx.post(
            _url_rest("sessions"),
            headers=_cabecalhos(),
            json={"id": session_id, "device_id": device_id, "total_messages": 1},
            timeout=15,
        ).raise_for_status()
    else:
        # Sessão já existe — incrementa o total e marca a última atividade
        httpx.patch(
            _url_rest("sessions"),
            headers=_cabecalhos(),
            params={"id": f"eq.{session_id}"},
            json={
                "total_messages": linhas[0]["total_messages"] + 1,
                # Última atividade da sessão (timestamp em UTC, formato ISO)
                "ended_at": datetime.now(timezone.utc).isoformat(),
            },
            timeout=15,
        ).raise_for_status()


def apagar_historico(device_id: str) -> int:
    """Apaga TODAS as conversas e sessões de um dispositivo.
    Devolve o número de conversas apagadas. Só o backend (service key)
    tem permissão de escrita — o pedido chega via POST /historico/apagar."""
    resposta = httpx.request(
        "DELETE",
        _url_rest("conversations"),
        headers={**_cabecalhos(), "Prefer": "return=representation"},
        params={"device_id": f"eq.{device_id}"},
        timeout=20,
    )
    resposta.raise_for_status()
    apagadas = len(resposta.json())
    # Apaga também as sessões associadas (estatísticas)
    httpx.request(
        "DELETE",
        _url_rest("sessions"),
        headers=_cabecalhos(),
        params={"device_id": f"eq.{device_id}"},
        timeout=20,
    ).raise_for_status()
    return apagadas


# ------------------------------------------------------------
# LOGS DO SISTEMA
# ------------------------------------------------------------
def registar_log(event_type: str, message: str) -> None:
    """Grava um evento em system_logs. Nunca deixa o pedido falhar por
    causa de um log (é 'melhor esforço')."""
    try:
        httpx.post(
            _url_rest("system_logs"),
            headers=_cabecalhos(),
            json={"event_type": event_type, "message": message[:500]},
            timeout=10,
        )
    except Exception as erro:  # noqa: BLE001 — log nunca pode rebentar o pedido
        logger.warning("Falha ao registar log: %s", erro)


# ------------------------------------------------------------
# REALTIME (Broadcast) — notificar a PWA em tempo real
# ------------------------------------------------------------
def enviar_broadcast(device_id: str, evento: str, payload: dict) -> None:
    """Envia um evento Realtime para o canal do dispositivo ("device-<uuid>").
    A PWA está subscrita a esse canal por WebSocket e atualiza-se sozinha.
    O payload leva apenas identificadores — os dados são sempre lidos por
    REST com RLS, por isso nada de conteúdo sensível circula no canal."""
    try:
        httpx.post(
            f"{config.SUPABASE_URL}/realtime/v1/api/broadcast",
            headers=_cabecalhos(),
            json={
                "messages": [
                    {
                        "topic": f"device-{device_id}",
                        "event": evento,
                        "payload": payload,
                    }
                ]
            },
            timeout=10,
        )
    except Exception as erro:  # noqa: BLE001 — notificação é "melhor esforço"
        logger.warning("Falha ao enviar broadcast: %s", erro)
