# DEPLOY.md — Pôr o JARVIS online, passo a passo

Guia escrito para seguir pelo browser, pela ordem indicada.
Tempo total estimado: **~40 minutos**.

Antes de começar, tem à mão (num bloco de notas temporário — apaga no fim):
- `ANTHROPIC_API_KEY` (console.anthropic.com → API Keys)
- Do Supabase (Settings → API): `Project URL`, `anon public key`, `service_role key`

---

## PASSO 1 — Supabase (base de dados) · ~5 min

1. Entra em https://supabase.com → **New project** → nome `jarvis`
   (região Europe West). Espera 1-2 minutos até ficar pronto.
2. No menu lateral: **SQL Editor** → **New query**.
3. Abre o ficheiro `schema.sql` deste projeto, copia TUDO, cola e **Run**.
   Deve dizer "Success. No rows returned".
4. Confirma em **Table Editor**: devem existir `conversations`, `sessions`
   e `system_logs`, todas com o escudo "RLS enabled".
5. Vai a **Settings → API** e copia:
   - **Project URL** → vai ser `SUPABASE_URL` e `VITE_SUPABASE_URL`
   - **anon public** → vai ser `VITE_SUPABASE_ANON_KEY`
   - **service_role** → vai ser `SUPABASE_SERVICE_KEY` (⚠️ SECRETA — só no backend)

## PASSO 2 — PythonAnywhere (backend) · ~15 min

1. Entra em https://www.pythonanywhere.com (conta gratuita "Beginner").
2. Abre uma **Bash console** (Consoles → Bash) e corre:
   ```bash
   git clone https://github.com/crskylander-hash/jarvis-pap.git
   cd jarvis-pap/backend
   mkvirtualenv jarvis --python=python3.12   # se falhar, usa python3.11
   pip install -r requirements.txt
   ```
   (a instalação demora uns minutos)
3. Cria o ficheiro com as chaves — na mesma consola:
   ```bash
   nano ~/jarvis-pap/backend/.env
   ```
   Conteúdo (substitui pelos teus valores reais). As duas linhas
   `*_PROXY` são OBRIGATÓRIAS nas contas gratuitas — sem elas, a app
   não consegue falar com o Supabase nem com a Anthropic:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ANTHROPIC_MODEL=claude-haiku-4-5-20251001
   SUPABASE_URL=https://xxxx.supabase.co
   SUPABASE_SERVICE_KEY=eyJ...
   FRONTEND_URL=http://localhost:5173
   HTTP_PROXY=http://proxy.server:3128
   HTTPS_PROXY=http://proxy.server:3128
   ```
   (o `FRONTEND_URL` será atualizado no Passo 4)
   Gravar: `Ctrl+O`, Enter, `Ctrl+X`.
   ⚠️ Cuidado ao colar: cada linha deve ter o nome UMA só vez
   (`SUPABASE_URL=https://...`, nunca `SUPABASE_URL=SUPABASE_URL=https://...`).
4. Cria o token da API: menu **Account** → separador **API Token**
   → **Create a new API token**.
5. O FastAPI é ASGI, por isso usamos o modo ASGI do PythonAnywhere
   (o modo clássico WSGI não serve). Abre uma consola Bash **NOVA**
   (para apanhar o token) e corre:
   ```bash
   pip install --user --upgrade pythonanywhere
   pa website create --domain oteuusername.pythonanywhere.com --command '/home/oteuusername/.virtualenvs/jarvis/bin/uvicorn --app-dir /home/oteuusername/jarvis-pap/backend --uds $DOMAIN_SOCKET main:app'
   ```
   (troca `oteuusername` pelo teu username, nos DOIS sítios; mantém as plicas)
   Deve responder "All done! Your site is now live".
6. Testa no browser: `https://oteuusername.pythonanywhere.com/health`
   → deve responder `{"estado":"online", ...}`. O Swagger está em `/docs`.
7. 📌 Sempre que mudares o código ou o `.env`, aplica com:
   ```bash
   pa website reload --domain oteuusername.pythonanywhere.com
   ```

## PASSO 3 — Vercel (frontend/PWA) · ~10 min

1. Entra em https://vercel.com → **Add New → Project** → importa o
   repositório GitHub `jarvis-pap`.
2. Em **Root Directory**, clica Edit e escolhe **`frontend`**.
   (Framework: Vite — detetado automaticamente)
3. Abre **Environment Variables** e adiciona as três:
   | Nome | Valor |
   |---|---|
   | `VITE_SUPABASE_URL` | o Project URL do Supabase |
   | `VITE_SUPABASE_ANON_KEY` | a chave anon public |
   | `VITE_BACKEND_URL` | `https://oteuusername.pythonanywhere.com` |
4. **Deploy**. No fim, copia o domínio (ex.: `https://jarvis-pap.vercel.app`).

## PASSO 4 — Fechar o círculo (CORS) · ~5 min

1. Volta ao PythonAnywhere → consola Bash:
   ```bash
   nano ~/jarvis-pap/backend/.env
   ```
   Atualiza a linha do FRONTEND_URL com o domínio da Vercel:
   ```
   FRONTEND_URL=https://jarvis-pap.vercel.app
   ```
2. Separador **Web** → **Reload**.
3. Abre a app na Vercel e faz uma pergunta ao JARVIS. 🎉

## PASSO 5 — Instalar a PWA (para a demonstração)

- **PC (Chrome/Edge)**: ícone de instalação na barra de endereço → "Instalar".
- **Android (Chrome)**: menu ⋮ → **Adicionar ao ecrã principal**.
- **iPhone (Safari)**: Partilhar → **Adicionar ao ecrã principal**.

## Problemas comuns

| Sintoma | Causa provável | Solução |
|---|---|---|
| `/health` não responde | Site ASGI mal criado | `pa website get --domain oteuusername.pythonanywhere.com` e vê o log em `/var/log/oteuusername.pythonanywhere.com.error.log` |
| 503 "Falha ao aceder à base de dados" | Faltam as linhas `HTTP_PROXY`/`HTTPS_PROXY` no `.env`, ou URL/chave com gralha | Confere o `.env` (Passo 2.3) + `pa website reload` |
| 503 "serviço de IA indisponível" | Chave Anthropic errada, sem crédito, ou modelo descontinuado | Verifica chave e saldo em console.anthropic.com; confirma o `ANTHROPIC_MODEL` |
| A app diz "erro ao contactar o JARVIS" | CORS | O `FRONTEND_URL` no `.env` do backend tem de ser EXATAMENTE o domínio da Vercel (com https, sem barra final) + `pa website reload` |
| Respostas não aparecem no histórico | schema.sql não corrido | Passo 1.3 |
