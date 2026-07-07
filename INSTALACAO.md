# INSTALACAO.md — Pôr o JARVIS a funcionar a partir do ZERO

Guia para montar o projeto completo numa máquina nova, sem nada instalado.
São três cenários independentes — usa o que precisares:

- **A.** Correr no teu PC (desenvolvimento/demonstração local)
- **B.** Pôr online (produção) → segue o [DEPLOY.md](DEPLOY.md)
- **C.** Instalar nos óculos (Raspberry Pi) → segue o [rpi-client/INSTALL_RPI.md](rpi-client/INSTALL_RPI.md)

---

## A. Correr o JARVIS no teu PC, do zero

### A.1 — Instalar as ferramentas (uma vez só)

| Ferramenta | Onde | Confirma com |
|---|---|---|
| Git | https://git-scm.com (Next, Next, Next…) | `git --version` |
| Python 3.12+ | https://python.org — ⚠️ marca **"Add python.exe to PATH"** no instalador | `python --version` |
| Node.js LTS | https://nodejs.org | `node --version` |

(Os comandos de confirmação correm-se no PowerShell: tecla Windows → escreve "powershell" → Enter.)

### A.2 — Obter o código

```powershell
cd $HOME
git clone https://github.com/crskylander-hash/jarvis-pap.git
cd jarvis-pap
```

### A.3 — Preparar o backend

```powershell
cd backend
python -m venv .venv                                # ambiente virtual isolado
.venv\Scripts\pip install -r requirements.txt       # dependências (~2 min)
copy .env.example .env                               # ficheiro de configuração
notepad .env                                         # ← preencher as chaves!
```

No `.env`, substitui os placeholders pelos valores reais:
- `ANTHROPIC_API_KEY` — console.anthropic.com → API Keys (precisa de crédito na conta)
- `SUPABASE_URL` e `SUPABASE_SERVICE_KEY` — painel do Supabase → Project Settings → API Keys (separador Legacy)
- `FRONTEND_URL=http://localhost:5173` (para uso local)
- ⚠️ No PC **não** precisas das linhas `HTTP_PROXY`/`HTTPS_PROXY` — são só para o PythonAnywhere.

Arrancar o backend:

```powershell
.venv\Scripts\python -m uvicorn main:app --reload
```

Deixa esta janela aberta. Testa no browser: `http://127.0.0.1:8000/health`
(e a documentação interativa em `http://127.0.0.1:8000/docs`).

### A.4 — Preparar o frontend (noutra janela do PowerShell)

```powershell
cd $HOME\jarvis-pap\frontend
npm install                                          # dependências (~1 min)
copy .env.example .env
notepad .env
```

No `.env` do frontend:
- `VITE_SUPABASE_URL` — o mesmo URL do Supabase
- `VITE_SUPABASE_ANON_KEY` — a chave **anon public** (Legacy), NÃO a service_role
- `VITE_BACKEND_URL=http://127.0.0.1:8000` (o backend local do passo A.3)

Arrancar:

```powershell
npm run dev
```

Abre `http://localhost:5173` — o JARVIS está a correr no teu PC 🎉

### A.5 — Correr os testes

```powershell
cd $HOME\jarvis-pap\backend
.venv\Scripts\python -m pytest tests -q             # esperado: 17 passed
```

---

## B. Pôr online (produção)

Todo o processo — Supabase + PythonAnywhere (modo ASGI) + Vercel + CORS —
está passo a passo no **[DEPLOY.md](DEPLOY.md)**. Resumo da arquitetura em produção:

| Camada | Serviço | URL |
|---|---|---|
| Base de dados | Supabase | (o teu projeto) |
| Backend | PythonAnywhere (ASGI/uvicorn) | https://lewist.pythonanywhere.com |
| Frontend/PWA | Vercel (deploy automático a cada git push) | https://jarvis-pap.vercel.app |

📌 Nota de manutenção: a conta gratuita do PythonAnywhere pede um clique em
**"Run until 1 month from today"** (separador Web) uma vez por mês, senão adormece.

---

## C. Óculos (Raspberry Pi Zero 2W)

Guia completo — flash do cartão SD, Wi-Fi headless, microfone, modelo de voz,
arranque automático — no **[rpi-client/INSTALL_RPI.md](rpi-client/INSTALL_RPI.md)**.

---

## Problemas comuns na instalação local

| Sintoma | Solução |
|---|---|
| `python` não é reconhecido | Reinstala o Python com "Add to PATH" marcado; fecha e reabre o PowerShell |
| `npm install` falha com erros de rede | Verifica a Internet/proxy da escola; tenta `npm install` outra vez |
| Backend arranca mas /chat dá 503 | Chaves erradas/incompletas no `backend/.env` (cada linha `NOME=valor`, nome UMA vez) |
| A app abre mas não responde | O backend local não está a correr, ou o `VITE_BACKEND_URL` não aponta para ele |
| Microfone não funciona | O browser só dá microfone em `localhost` ou HTTPS; usa o Chrome e autoriza quando pedir |
