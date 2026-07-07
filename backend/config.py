# ============================================================
# PROJETO JARVIS — Configuração do backend
# Lê as variáveis de ambiente a partir do ficheiro .env
# (as chaves NUNCA ficam no código — ver .env.example)
# ============================================================
import os
from pathlib import Path

from dotenv import load_dotenv

# Carrega o .env que está na mesma pasta que este ficheiro
load_dotenv(Path(__file__).parent / ".env")

# --- Chaves e URLs (definidas no .env / PythonAnywhere) ---
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

# Modelo da Anthropic a usar (fixado numa versão estável)
# Nota: o claude-3-5-haiku-20241022 foi descontinuado pela Anthropic;
# usamos o Haiku 4.5, o modelo rápido/económico atual (julho de 2026).
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001")

# Domínios autorizados a chamar o backend (CORS).
# Aceita vários separados por vírgula, ex.: "https://jarvis.vercel.app,http://localhost:5173"
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
ORIGENS_PERMITIDAS = [u.strip() for u in FRONTEND_URL.split(",") if u.strip()]
# Em desenvolvimento local, o Vite corre em localhost:5173 — adicionamos sempre
for _origem_dev in ("http://localhost:5173", "http://127.0.0.1:5173"):
    if _origem_dev not in ORIGENS_PERMITIDAS:
        ORIGENS_PERMITIDAS.append(_origem_dev)

# --- Parâmetros do assistente ---
# Número de turnos (pergunta+resposta) de memória por dispositivo
TURNOS_MEMORIA = 10
# Máximo de tokens na resposta do modelo
MAX_TOKENS_RESPOSTA = 1024
# Tentativas automáticas em caso de falha temporária da API
TENTATIVAS_API = 3

# System prompt do JARVIS (personalidade do assistente)
SYSTEM_PROMPT_JARVIS = (
    "És o JARVIS, assistente pessoal do Carlos. Respondes sempre em português "
    "de Portugal, de forma natural, útil e concisa — 1 a 3 frases faladas, exceto "
    "quando pedem conteúdo extenso. Quando a resposta for longa e o utilizador "
    "pedir para enviar para a app, resume numa frase e confirma o envio. És "
    "educado, com um toque subtil de humor britânico."
)
