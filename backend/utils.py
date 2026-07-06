# ============================================================
# PROJETO JARVIS — Utilitários do backend
# Deteção do comando de voz "envia para a app" (e variações)
# ============================================================
import re
import unicodedata


def normalizar(texto: str) -> str:
    """Normaliza texto para comparação: minúsculas e sem acentos.

    Ex.: "Envia para a Aplicação!" -> "envia para a aplicacao!"
    Assim, a deteção funciona mesmo que o reconhecimento de voz
    devolva o texto com ou sem acentos.
    """
    texto = texto.lower().strip()
    # Decompõe caracteres acentuados (ã -> a + ~) e remove os diacríticos
    texto = unicodedata.normalize("NFD", texto)
    return "".join(c for c in texto if unicodedata.category(c) != "Mn")


# Expressão regular que apanha as variações naturais do comando:
#   "envia para a app", "manda para o telemóvel", "envia isso para a aplicação",
#   "podes mandar para o telefone", "envia lá para a app", etc.
# Estrutura: (verbo de envio) ... (destino: app/aplicação/telemóvel/telefone)
_PADRAO_COMANDO_APP = re.compile(
    r"\b(envia|enviar|envies|manda|mandar|mandes|passa|passar|poe|por)\b"  # verbo
    r".{0,40}?"                                                             # até 40 chars pelo meio ("isso", "lá", "essa resposta")
    r"\b(app|aplicacao|telemovel|telefone|movel)\b"                         # destino (já sem acentos)
)


def detetar_comando_app(mensagem: str) -> bool:
    """Devolve True se a mensagem for um pedido para enviar a resposta para a app."""
    return bool(_PADRAO_COMANDO_APP.search(normalizar(mensagem)))


def resumo_fallback(texto: str, max_carateres: int = 120) -> str:
    """Resumo de emergência caso a chamada à API para resumir falhe:
    devolve a primeira frase (ou os primeiros carateres) da resposta."""
    # Tenta cortar na primeira frase completa
    partes = re.split(r"(?<=[.!?])\s", texto.strip())
    primeira = partes[0] if partes else texto.strip()
    if len(primeira) > max_carateres:
        primeira = primeira[: max_carateres - 1].rstrip() + "…"
    return primeira
