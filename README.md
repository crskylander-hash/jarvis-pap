# J.A.R.V.I.S — Assistente Pessoal de Voz

**PAP de Carlos Rafael Resendes Silva** · Curso Profissional de Programador
de Informática · Agrupamento de Escolas Rafael Bordalo Pinheiro · 2026

O JARVIS é um assistente virtual de voz inspirado no do Iron Man, com dois
"rostos" ligados ao mesmo cérebro na cloud:

- **PWA** (telemóvel e PC) — voz, texto, histórico, dashboard de métricas
- **Óculos** com Raspberry Pi Zero 2W — mãos-livres: microfone + altifalante

```
[Óculos: RPi Zero 2W]          [PWA: telemóvel/PC]
   mic + altifalante              voz + texto + histórico
        │                              │
        └────────────┬─────────────────┘
                     ▼
        [Backend FastAPI @ PythonAnywhere]
          • memória: últimos 10 turnos por dispositivo
          • chama a API Anthropic (claude-haiku-4-5)
          • grava tudo no Supabase
                     ▼
        [Supabase PostgreSQL + RLS]
                     │  Realtime (WebSocket)
                     ▼
        [PWA/Dashboard atualiza sozinho]
```

## Funcionalidades

- 🎙 **Voz em pt-PT**: reconhecimento (Web Speech API) e síntese (Speech
  Synthesis), com velocidade configurável e interrupção imediata
- 🔊 **Wake word "JARVIS"** com correção de erros de reconhecimento
  (dicionário + distância de Levenshtein ≤ 2)
- 📱 **"Envia para a app"**: respostas longas vão para uma vista de leitura
  na PWA; por voz ouve-se só um resumo de uma frase
- 🧠 **Memória** por dispositivo (janela deslizante de 10 turnos)
- 🔒 **Privacidade sem contas**: identidade anónima por `device_id` +
  Row Level Security no PostgreSQL — cada dispositivo só lê o que é seu
- 📊 **Dashboard em tempo real**: latência média, tokens, custo estimado,
  estado online/offline (via Supabase Realtime)
- 📴 **PWA instalável** em PC, Android e iPhone

## Estrutura do projeto

| Pasta / ficheiro | O que é |
|---|---|
| `backend/` | API FastAPI (Python 3.12) — `/chat`, `/health`, `/docs` |
| `frontend/` | PWA em React 18 + Tailwind (Vite) |
| `rpi-client/` | Cliente Python dos óculos (Vosk + espeak-ng) + guia de montagem do SO |
| `schema.sql` | Base de dados: tabelas + RLS, pronto a colar no Supabase |
| `INSTALACAO.md` | Instalação a partir do zero (PC novo, sem nada instalado) |
| `DEPLOY.md` | Deploy passo a passo (Supabase → PythonAnywhere → Vercel) |
| `DECISOES.md` | Decisões técnicas com justificação (para a defesa) |
| `TESTES.md` | Testes automáticos + checklist manual |

## Correr localmente

### Backend
```bash
cd backend
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt      # Windows
copy .env.example .env                              # preencher as chaves!
.venv\Scripts\python -m uvicorn main:app --reload   # http://127.0.0.1:8000/docs
```

### Frontend
```bash
cd frontend
npm install
copy .env.example .env        # preencher com o URL do Supabase e do backend
npm run dev                   # http://localhost:5173
```

### Testes
```bash
cd backend
.venv\Scripts\python -m pytest tests -q    # 17 testes
```

## Melhorias futuras
- Supabase Auth (contas de utilizador com email/password)
- Streaming das respostas (texto a aparecer palavra a palavra)
- Wake word por modelo acústico dedicado (ex.: Porcupine) nos óculos
