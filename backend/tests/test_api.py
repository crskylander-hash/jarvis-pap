# ============================================================
# PROJETO JARVIS — Testes de ponta a ponta do backend (pytest)
#
# Os serviços externos (API Anthropic e Supabase) são SIMULADOS
# (monkeypatch), para os testes correrem sem chaves nem Internet.
# Correr com:  pytest  (dentro da pasta backend, com o venv ativo)
# ============================================================
import sys
from pathlib import Path

# Garante que os módulos do backend são importáveis a partir da pasta tests/
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from fastapi.testclient import TestClient

import base_dados
import main
import servico_claude
import utils

cliente = TestClient(main.app)


# ------------------------------------------------------------
# Simulações (fakes) dos serviços externos
# ------------------------------------------------------------
@pytest.fixture
def bd_simulada(monkeypatch):
    """Substitui todas as funções da base de dados por versões em memória."""
    gravadas = []

    monkeypatch.setattr(base_dados, "obter_historico", lambda d, n: [
        {"user_input": "olá", "claude_response": "Olá, Carlos."},
    ])
    monkeypatch.setattr(base_dados, "gravar_conversa",
                        lambda *a, **k: (gravadas.append((a, k)) or {"id": "conv-1"}))
    monkeypatch.setattr(base_dados, "atualizar_sessao", lambda *a: None)
    monkeypatch.setattr(base_dados, "registar_log", lambda *a: None)
    monkeypatch.setattr(base_dados, "enviar_broadcast", lambda *a, **k: None)
    monkeypatch.setattr(base_dados, "obter_ultima_conversa", lambda d: {
        "id": "conv-1",
        "claude_response": "Uma resposta longa sobre a história de Portugal. Com detalhe.",
    })
    monkeypatch.setattr(base_dados, "marcar_para_app", lambda cid: None)
    return gravadas


@pytest.fixture
def claude_simulado(monkeypatch):
    """Substitui as chamadas à API da Anthropic por respostas fixas."""
    monkeypatch.setattr(servico_claude, "gerar_resposta",
                        lambda h, m, idioma="pt-PT": ("Resposta simulada do JARVIS.", 42))
    monkeypatch.setattr(servico_claude, "resumir_para_voz",
                        lambda t, idioma="pt-PT": ("Resumo numa frase.", 10))


# ------------------------------------------------------------
# TESTES — endpoint /health
# ------------------------------------------------------------
def test_health_devolve_online():
    """O /health responde 200 e indica que está online (indicador do dashboard)."""
    resposta = cliente.get("/health")
    assert resposta.status_code == 200
    assert resposta.json()["estado"] == "online"


# ------------------------------------------------------------
# TESTES — validação do pedido /chat
# ------------------------------------------------------------
def test_chat_recusa_pedido_incompleto():
    """Sem device_id/mensagem o FastAPI recusa com 422 (validação automática)."""
    resposta = cliente.post("/chat", json={"mensagem": "olá"})
    assert resposta.status_code == 422


def test_chat_recusa_mensagem_vazia():
    resposta = cliente.post("/chat", json={
        "device_id": "d" * 12, "session_id": "s" * 12, "mensagem": "",
    })
    assert resposta.status_code == 422


# ------------------------------------------------------------
# TESTES — fluxo normal de conversa (ponta a ponta, simulado)
# ------------------------------------------------------------
def test_chat_fluxo_normal(bd_simulada, claude_simulado):
    """Pergunta normal: responde com o texto do modelo, grava e mede latência."""
    resposta = cliente.post("/chat", json={
        "device_id": "dispositivo-teste-123",
        "session_id": "sessao-teste-123",
        "mensagem": "Que horas são?",
    })
    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["resposta"] == "Resposta simulada do JARVIS."
    assert corpo["display_mode"] == "voice"
    assert corpo["tokens_used"] == 42
    assert corpo["latency_ms"] >= 0
    assert len(bd_simulada) == 1  # gravou exatamente um turno


def test_chat_com_idioma(bd_simulada, monkeypatch):
    """O idioma escolhido na app chega ao serviço do modelo."""
    idiomas_recebidos = []

    def gerar_falso(historico, mensagem, idioma="pt-PT"):
        idiomas_recebidos.append(idioma)
        return ("Simulated JARVIS reply.", 42)

    monkeypatch.setattr(servico_claude, "gerar_resposta", gerar_falso)
    resposta = cliente.post("/chat", json={
        "device_id": "dispositivo-teste-123",
        "session_id": "sessao-teste-123",
        "mensagem": "What time is it?",
        "idioma": "en-GB",
    })
    assert resposta.status_code == 200
    assert idiomas_recebidos == ["en-GB"]


def test_system_prompt_muda_com_idioma():
    """Em pt-PT o system prompt fica intacto; noutros idiomas ganha a instrução extra."""
    base = servico_claude._system_prompt("pt-PT")
    ingles = servico_claude._system_prompt("en-GB")
    assert base == servico_claude.config.SYSTEM_PROMPT_JARVIS
    assert "British English" in ingles


# ------------------------------------------------------------
# TESTES — comando "envia para a app"
# ------------------------------------------------------------
def test_chat_comando_envia_para_app(bd_simulada, claude_simulado):
    """O comando marca a última resposta para a app e responde só com o resumo."""
    resposta = cliente.post("/chat", json={
        "device_id": "dispositivo-teste-123",
        "session_id": "sessao-teste-123",
        "mensagem": "envia isso para a app",
    })
    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["display_mode"] == "app"
    assert "Enviei o resto para a tua app." in corpo["resposta"]
    assert "Resumo numa frase." in corpo["resposta"]


def test_chat_envio_sem_historico(monkeypatch, claude_simulado):
    """Se ainda não há respostas, o JARVIS explica que não tem nada para enviar."""
    monkeypatch.setattr(base_dados, "obter_ultima_conversa", lambda d: None)
    monkeypatch.setattr(base_dados, "gravar_conversa", lambda *a, **k: {"id": "x"})
    resposta = cliente.post("/chat", json={
        "device_id": "dispositivo-teste-123",
        "session_id": "sessao-teste-123",
        "mensagem": "manda para o telemóvel",
    })
    assert resposta.status_code == 200
    assert "não tenho nenhuma resposta" in resposta.json()["resposta"].lower()


# ------------------------------------------------------------
# TESTES UNITÁRIOS — deteção do comando (variações de PT falado)
# ------------------------------------------------------------
@pytest.mark.parametrize("frase", [
    "envia para a app",
    "Envia isso para a APP",
    "manda para o telemóvel",
    "manda lá isso para o telemovel",
    "podes enviar essa resposta para a aplicação",
    "passa para o telefone",
])
def test_deteta_comando_app(frase):
    assert utils.detetar_comando_app(frase) is True


@pytest.mark.parametrize("frase", [
    "que horas são",
    "fala-me da app store",            # menciona "app" mas não é um pedido de envio
    "o meu telemóvel é novo",          # menciona "telemóvel" sem verbo de envio
    "envia um abraço à minha mãe",     # verbo de envio mas sem destino app/telemóvel
])
def test_nao_deteta_comando_em_frases_normais(frase):
    assert utils.detetar_comando_app(frase) is False


# ------------------------------------------------------------
# TESTE UNITÁRIO — resumo de emergência (fallback)
# ------------------------------------------------------------
def test_resumo_fallback_corta_na_primeira_frase():
    texto = "Primeira frase curta. Segunda frase que não deve aparecer."
    assert utils.resumo_fallback(texto) == "Primeira frase curta."
