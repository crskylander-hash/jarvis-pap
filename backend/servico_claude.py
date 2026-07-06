# ============================================================
# PROJETO JARVIS — Serviço de ligação à API da Anthropic
# Constrói o prompt (system prompt + memória) e chama o modelo
# claude-3-5-haiku com tentativas automáticas em caso de falha.
# ============================================================
import logging

import anthropic

import config

logger = logging.getLogger("jarvis.claude")

# Cliente criado de forma "preguiçosa" (só na primeira utilização),
# para os testes correrem sem precisarem de chave real.
_cliente: anthropic.Anthropic | None = None


def _obter_cliente() -> anthropic.Anthropic:
    """Devolve o cliente da Anthropic, criando-o na primeira chamada.

    max_retries=TENTATIVAS_API: o próprio SDK repete automaticamente a
    chamada em caso de erro temporário (429, 5xx, falha de rede),
    com espera exponencial entre tentativas.
    """
    global _cliente
    if _cliente is None:
        _cliente = anthropic.Anthropic(
            api_key=config.ANTHROPIC_API_KEY,
            max_retries=config.TENTATIVAS_API,
        )
    return _cliente


def gerar_resposta(historico: list[dict], mensagem: str) -> tuple[str, int]:
    """Chama o modelo com a memória da conversa e devolve (resposta, tokens_usados).

    historico: lista de turnos anteriores do dispositivo, do mais antigo
               para o mais recente: [{"user_input": ..., "claude_response": ...}, ...]
    mensagem:  a pergunta atual do utilizador.
    """
    # Converte o histórico para o formato de mensagens da API
    # (alternância user/assistant, exigida pela Anthropic)
    mensagens = []
    for turno in historico:
        mensagens.append({"role": "user", "content": turno["user_input"]})
        mensagens.append({"role": "assistant", "content": turno["claude_response"]})
    mensagens.append({"role": "user", "content": mensagem})

    resposta = _obter_cliente().messages.create(
        model=config.ANTHROPIC_MODEL,
        max_tokens=config.MAX_TOKENS_RESPOSTA,
        system=config.SYSTEM_PROMPT_JARVIS,
        messages=mensagens,
    )

    texto = resposta.content[0].text if resposta.content else ""
    # tokens_used = tokens de entrada + tokens de saída (para as métricas)
    tokens = resposta.usage.input_tokens + resposta.usage.output_tokens
    return texto, tokens


def resumir_para_voz(texto_longo: str) -> tuple[str, int]:
    """Pede ao modelo um resumo de UMA frase, para ser dito por voz
    quando a resposta completa é enviada para a app.

    Devolve (resumo, tokens_usados)."""
    resposta = _obter_cliente().messages.create(
        model=config.ANTHROPIC_MODEL,
        max_tokens=100,
        system=(
            "Resume o texto do utilizador numa ÚNICA frase curta em português "
            "de Portugal, para ser dita em voz alta. Responde só com a frase."
        ),
        messages=[{"role": "user", "content": texto_longo}],
    )
    texto = resposta.content[0].text.strip() if resposta.content else ""
    tokens = resposta.usage.input_tokens + resposta.usage.output_tokens
    return texto, tokens
