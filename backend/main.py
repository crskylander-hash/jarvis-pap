# ============================================================
# PROJETO JARVIS — Backend FastAPI
# Autor: Carlos Rafael Resendes Silva — PAP 2026
#
# Endpoints:
#   POST /chat   — recebe {device_id, session_id, mensagem}, responde com o JARVIS
#   GET  /health — estado do sistema (para o indicador online/offline da PWA)
#   /docs        — documentação Swagger gerada automaticamente pelo FastAPI
#
# Fluxo do /chat:
#   1. Se a mensagem for o comando "envia para a app" → marca a última
#      resposta com display_mode='app', responde por voz só com um resumo.
#   2. Caso contrário → vai buscar os últimos 10 turnos deste dispositivo
#      (memória), chama a API da Anthropic e grava tudo no Supabase.
#   3. Em ambos os casos, envia um evento Realtime para a PWA atualizar.
# ============================================================
import logging
import time

import anthropic
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import base_dados
import config
import servico_claude
import utils

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("jarvis.api")

app = FastAPI(
    title="JARVIS — Backend",
    description="Backend do assistente de voz JARVIS (PAP de Carlos Silva). "
    "Recebe perguntas da PWA e dos óculos (Raspberry Pi), chama a API da "
    "Anthropic e guarda tudo no Supabase.",
    version="1.0.0",
)

# CORS — só os domínios autorizados (Vercel + localhost) podem chamar o backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.ORIGENS_PERMITIDAS,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ------------------------------------------------------------
# Modelos de dados (validação automática do FastAPI/Pydantic)
# ------------------------------------------------------------
class PedidoChat(BaseModel):
    """Corpo do pedido POST /chat."""
    device_id: str = Field(min_length=8, description="UUID anónimo do dispositivo")
    session_id: str = Field(min_length=8, description="UUID da sessão de utilização")
    mensagem: str = Field(min_length=1, max_length=4000, description="Pergunta do utilizador")
    # Idioma escolhido na app (opcional; por defeito português de Portugal)
    idioma: str = Field(default="pt-PT", max_length=10, description="Idioma da resposta (ex.: pt-PT, en-GB)")
    # Anexo de imagem (opcional): conteúdo em base64 + tipo. O modelo Claude
    # consegue VER imagens — limite ~4 MB de base64 (≈3 MB de ficheiro).
    imagem_base64: str | None = Field(default=None, max_length=5_500_000, description="Imagem anexada (base64)")
    imagem_tipo: str | None = Field(default=None, max_length=20, description="Tipo MIME (image/jpeg, image/png, ...)")


class PedidoApagar(BaseModel):
    """Corpo do pedido POST /historico/apagar."""
    device_id: str = Field(min_length=8, description="UUID anónimo do dispositivo")


class RespostaChat(BaseModel):
    """Corpo da resposta do POST /chat."""
    resposta: str            # texto a dizer/mostrar ao utilizador
    display_mode: str        # 'voice' (falar tudo) ou 'app' (foi enviada para a app)
    tokens_used: int         # tokens gastos neste turno
    latency_ms: int          # latência total em milissegundos


# ------------------------------------------------------------
# GET /health — usado pelo indicador online/offline do dashboard
# ------------------------------------------------------------
@app.get("/health")
def health():
    """Confirma que o backend está vivo e devolve o modelo em uso."""
    return {"estado": "online", "modelo": config.ANTHROPIC_MODEL}


# ------------------------------------------------------------
# POST /chat — o endpoint principal do JARVIS
# ------------------------------------------------------------
@app.post("/chat", response_model=RespostaChat)
def chat(pedido: PedidoChat):
    inicio = time.monotonic()  # para medir a latência

    try:
        # ---------- CASO 1: comando "envia para a app" ----------
        if utils.detetar_comando_app(pedido.mensagem):
            return _processar_envio_para_app(pedido, inicio)

        # ---------- CASO 2: pergunta normal ----------
        # 1) Memória: últimos 10 turnos deste dispositivo (sliding window)
        historico = base_dados.obter_historico(pedido.device_id, config.TURNOS_MEMORIA)

        # 2) Chama o modelo (o SDK repete sozinho em caso de falha temporária).
        #    Se vier imagem anexada, o modelo analisa-a (visão).
        texto, tokens = servico_claude.gerar_resposta(
            historico, pedido.mensagem, pedido.idioma,
            pedido.imagem_base64, pedido.imagem_tipo,
        )

        latencia = int((time.monotonic() - inicio) * 1000)

        # 3) Grava o turno no Supabase e atualiza a sessão.
        #    A imagem em si não é guardada (privacidade + espaço) — fica só a marca.
        registo_pergunta = pedido.mensagem + (" 📎[imagem anexada]" if pedido.imagem_base64 else "")
        linha = base_dados.gravar_conversa(
            pedido.device_id, pedido.session_id,
            registo_pergunta, texto, tokens, latencia,
        )
        base_dados.atualizar_sessao(pedido.session_id, pedido.device_id)

        # 4) Notifica a PWA em tempo real (dashboard/histórico atualizam sozinhos)
        base_dados.enviar_broadcast(
            pedido.device_id, "nova_mensagem", {"conversa_id": linha.get("id", "")}
        )

        return RespostaChat(
            resposta=texto, display_mode="voice",
            tokens_used=tokens, latency_ms=latencia,
        )

    # ---------- Gestão de erros com mensagens em PT-PT ----------
    except anthropic.APIStatusError as erro:
        # A API da Anthropic devolveu erro mesmo depois das tentativas automáticas
        base_dados.registar_log("erro_api", f"Anthropic {erro.status_code}: {erro.message}")
        raise HTTPException(
            status_code=503,
            detail="O serviço de IA está temporariamente indisponível. Tenta outra vez daqui a uns segundos.",
        )
    except anthropic.APIConnectionError:
        base_dados.registar_log("erro_api", "Sem ligação à API da Anthropic")
        raise HTTPException(
            status_code=503,
            detail="Não consegui contactar o serviço de IA. Verifica a ligação à Internet do servidor.",
        )
    except httpx.HTTPError as erro:
        # Falha na comunicação com o Supabase
        base_dados.registar_log("erro_bd", f"Supabase: {erro}")
        raise HTTPException(
            status_code=503,
            detail="Falha ao aceder à base de dados. Tenta novamente.",
        )


# ------------------------------------------------------------
# POST /historico/apagar — direito ao esquecimento
# ------------------------------------------------------------
@app.post("/historico/apagar")
def apagar_historico(pedido: PedidoApagar):
    """Apaga todo o histórico (conversas + sessões) de um dispositivo.
    A app pede dupla confirmação antes de chamar este endpoint."""
    try:
        apagadas = base_dados.apagar_historico(pedido.device_id)
        base_dados.registar_log("historico_apagado", f"{apagadas} conversas do device {pedido.device_id[:8]}…")
        base_dados.enviar_broadcast(pedido.device_id, "historico_apagado", {"apagadas": apagadas})
        return {"apagadas": apagadas}
    except httpx.HTTPError:
        raise HTTPException(status_code=503, detail="Falha ao apagar o histórico. Tenta novamente.")


def _processar_envio_para_app(pedido: PedidoChat, inicio: float) -> RespostaChat:
    """Trata o comando de voz "envia para a app":
    marca a última resposta do dispositivo com display_mode='app',
    gera um resumo de 1 frase para dizer por voz e notifica a PWA."""
    ultima = base_dados.obter_ultima_conversa(pedido.device_id)

    if ultima is None:
        # Não há nada para enviar — resposta simpática por voz
        texto = "Ainda não tenho nenhuma resposta para enviar para a tua app."
        latencia = int((time.monotonic() - inicio) * 1000)
        base_dados.gravar_conversa(
            pedido.device_id, pedido.session_id, pedido.mensagem, texto, 0, latencia
        )
        return RespostaChat(resposta=texto, display_mode="voice", tokens_used=0, latency_ms=latencia)

    # 1) Marca a última resposta para aparecer na vista de leitura da PWA
    base_dados.marcar_para_app(ultima["id"])

    # 2) Resumo de 1 frase para dizer por voz (com plano B se a API falhar)
    try:
        resumo, tokens = servico_claude.resumir_para_voz(ultima["claude_response"], pedido.idioma)
    except Exception:  # noqa: BLE001 — o envio nunca falha por causa do resumo
        resumo, tokens = utils.resumo_fallback(ultima["claude_response"]), 0

    texto_voz = f"{resumo} Enviei o resto para a tua app."
    latencia = int((time.monotonic() - inicio) * 1000)

    # 3) Grava este turno (o comando + a confirmação) e regista o evento
    base_dados.gravar_conversa(
        pedido.device_id, pedido.session_id, pedido.mensagem, texto_voz, tokens, latencia
    )
    base_dados.atualizar_sessao(pedido.session_id, pedido.device_id)
    base_dados.registar_log("envio_app", f"Conversa {ultima['id']} enviada para a app")

    # 4) Notifica a PWA: mostra notificação e abre a vista de leitura
    base_dados.enviar_broadcast(
        pedido.device_id, "resposta_para_app", {"conversa_id": ultima["id"]}
    )

    return RespostaChat(
        resposta=texto_voz, display_mode="app", tokens_used=tokens, latency_ms=latencia
    )


# Para desenvolvimento local: python -m uvicorn main:app --reload
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
