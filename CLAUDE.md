# PROJETO JARVIS — PAP (Prova de Aptidão Profissional)

## CONTEXTO — LÊ ISTO PRIMEIRO
Sou o Carlos Rafael Resendes Silva, aluno do 3.º ano do Curso Profissional de
Programador de Informática (Agrupamento de Escolas Rafael Bordalo Pinheiro,
Caldas da Rainha). Este projeto é a minha PAP e vai ser defendido perante um
júri ESTA QUINTA-FEIRA. Prazo real de código: terça à noite. Tudo tem de
funcionar, ser demonstrável ao vivo e estar comentado em PT-PT porque vou
ter de explicar cada parte ao júri.

O JARVIS é um assistente virtual de voz com 3 camadas + um protótipo físico
(óculos com Raspberry Pi Zero 2W) que eu monto em paralelo. O software já
foi parcialmente construído antes; reconstrói/refina tudo de forma limpa.

## PERMISSÕES E MODO DE TRABALHO
- Tens permissão para criar/editar ficheiros e correr comandos nesta pasta
  sem pedir confirmação.
- Trabalha a especificação TODA de seguida, sem parar para perguntar.
- Quando houver decisões em aberto, escolhe a opção mais simples e fiável
  e regista-a em DECISOES.md (uma linha por decisão, com justificação curta).
- NÃO faças git push nem deploys — isso fica para o Carlos de manhã.
- NUNCA escrevas chaves/segredos em ficheiros. Usa variáveis de ambiente
  e um ficheiro .env.example com placeholders. Cria .gitignore que exclua .env.
- Código comentado em português de Portugal. Interfaces todas em PT-PT.
- Não inventes funcionalidades fora desta lista. Âmbito fechado.

## ARQUITETURA (JÁ DECIDIDA — NÃO ALTERAR)
```
[Óculos: RPi Zero 2W]          [PWA: telemóvel/PC]
   mic + altifalante              voz + texto + histórico
        │                              │
        └────────────┬─────────────────┘
                     ▼
        [Backend FastAPI @ PythonAnywhere]
          • recebe pergunta + device_id
          • memória: últimos 10 turnos desse device (sliding window)
          • chama API Anthropic (claude-3-5-haiku)
          • grava tudo no Supabase
                     ▼
        [Supabase PostgreSQL + RLS]
                     │  Realtime (WebSocket)
                     ▼
        [PWA/Dashboard atualiza sozinho]
```

- Frontend: React 18 + Tailwind, PWA instalável, deploy na Vercel
- Backend: Python 3.12 + FastAPI, deploy no PythonAnywhere (tier gratuito —
  atenção: tem whitelist de domínios externos; usar só api.anthropic.com e
  *.supabase.co)
- Base de dados: Supabase (PostgreSQL) + Supabase Realtime
- IA: API da Anthropic, modelo claude-3-5-haiku
- SEM contas de utilizador: identidade = device_id (UUID) gerado no frontend
  na primeira visita, guardado em localStorage. Row Level Security no Supabase
  garante que cada device só lê as suas próprias conversas. (Supabase Auth
  fica documentado como melhoria futura, não implementar.)

## TAREFAS, POR ESTA ORDEM
1. **Backend FastAPI**: endpoint POST /chat (recebe {device_id, session_id,
   mensagem}), constrói prompt com system prompt do JARVIS + últimos 10
   turnos desse device, chama a API Anthropic com retry automático e gestão
   de erros, grava pergunta+resposta no Supabase. CORS configurado para o
   domínio Vercel (usar variável de ambiente FRONTEND_URL). Endpoint GET
   /health para o indicador online/offline. Swagger UI automático em /docs.
2. **Base de dados**: tabelas conversations (id UUID, device_id, session_id,
   user_input TEXT, claude_response TEXT, display_mode TEXT default 'voice',
   timestamp TIMESTAMPTZ, tokens_used INTEGER), sessions (id, device_id,
   started_at, ended_at, total_messages), system_logs (id, event_type,
   message, created_at). Políticas RLS: cada device_id só lê as suas linhas;
   escrita só via backend (service key). Entregar tudo em schema.sql pronto
   a colar no SQL Editor do Supabase.
3. **Frontend PWA (React 18 + Tailwind)**:
   - STT via Web Speech API em pt-PT, ativação por clique, transcrição
     contínua com feedback visual.
   - Wake word "JARVIS" com pós-processamento: dicionário de substituições
     de erros comuns (jarvi, jarve, davis, etc.) + distância de Levenshtein
     com tolerância de 2 caracteres.
   - TTS via Speech Synthesis API, voz PT, velocidade configurável
     (0,8×–1,5×), interrompível a qualquer momento.
   - device_id (UUID) gerado e persistido em localStorage na primeira visita.
   - Manifest + service worker para ser PWA instalável (PC e telemóvel).
   - Tema escuro, estética "JARVIS/Iron Man" sóbria (azul/ciano sobre escuro).
4. **Funcionalidade "envia para a app"**: quando o utilizador diz "envia
   para a app" / "manda para o telemóvel" (detetar variações), o backend
   marca a última resposta com display_mode='app'; a PWA mostra notificação
   e a resposta completa numa vista de leitura dedicada. Por voz, o JARVIS
   diz apenas um resumo de 1 frase + "enviei o resto para a tua app".
5. **Dashboard (dentro da PWA, rota /dashboard)**: histórico de conversas,
   métricas em tempo real (latência média, tokens usados, n.º de conversas,
   custo estimado), indicador de estado do sistema (online/offline via
   /health), atualização automática via Supabase Realtime.
6. **Cliente Python para Raspberry Pi Zero 2W** (pasta rpi-client/):
   corre em Raspberry Pi OS Lite; captura áudio de micro USB (usar
   sounddevice ou pyaudio), detecção simples de wake word local, envia
   ao backend POST /chat, reproduz a resposta com TTS local (espeak-ng
   em pt) ou reprodução do texto via pyttsx3 — escolhe o mais fiável e
   regista em DECISOES.md. Script systemd para arranque automático.
   Incluir requirements.txt próprio e INSTALL_RPI.md com passos exatos
   (flash do SD com Raspberry Pi Imager, ligação Wi-Fi headless, etc.).
7. **Testes**: testes básicos de ponta a ponta do backend (pytest) +
   checklist manual de testes da PWA em TESTES.md.

## ENTREGÁVEIS FINAIS (além do código)
- schema.sql — tabelas + RLS, pronto a colar no Supabase
- DEPLOY.md — passos exatos: (1) Supabase: colar schema.sql; (2)
  PythonAnywhere: upload do backend, criar webapp, onde colar
  ANTHROPIC_API_KEY e SUPABASE_SERVICE_KEY e SUPABASE_URL; (3) Vercel:
  ligar ao repo GitHub, onde colar VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
  e VITE_BACKEND_URL; (4) atualizar FRONTEND_URL no backend. Escrito para
  um aluno seguir passo a passo pelo browser.
- DECISOES.md — decisões tomadas com justificação (vou usar na defesa)
- TESTES.md — checklist de testes manuais
- README.md — visão geral e execução local
- .env.example — todas as variáveis com placeholders

## SYSTEM PROMPT DO JARVIS (usar no backend)
"És o JARVIS, assistente pessoal do Carlos. Respondes sempre em português
de Portugal, de forma natural, útil e concisa — 1 a 3 frases faladas, exceto
quando pedem conteúdo extenso. Quando a resposta for longa e o utilizador
pedir para enviar para a app, resume numa frase e confirma o envio. És
educado, com um toque subtil de humor britânico."

## O QUE O CARLOS FAZ DE MANHÃ (não é contigo, mas para saberes o plano)
1. Colar schema.sql no Supabase
2. Colar chaves no PythonAnywhere e Vercel seguindo o teu DEPLOY.md
3. git push para github.com/crskylander-hash/jarvis-pap
4. Montar o protótipo físico (RPi Zero 2W + mic USB + altifalante em
   armação de óculos) com o guia à parte
