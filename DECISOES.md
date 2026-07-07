# DECISÕES TÉCNICAS — Projeto JARVIS (para a defesa da PAP)

Cada decisão tomada durante o desenvolvimento, com a justificação curta.

| # | Decisão | Justificação |
|---|---------|--------------|
| 1 | Modelo fixado em `claude-haiku-4-5-20251001` (versão datada, não "latest") | Garante que a demo se comporta igual no dia da defesa. Nota: o plano inicial usava o claude-3-5-haiku, mas esse modelo foi entretanto descontinuado pela Anthropic (descoberto no deploy — o modelo ser configurável por variável de ambiente tornou a troca trivial). |
| 2 | Backend acede ao Supabase por REST (PostgREST) com `httpx`, sem biblioteca extra | Menos dependências no PythonAnywhere, código mais fácil de explicar ao júri; a service key vai nos cabeçalhos. |
| 3 | Retry da API Anthropic via `max_retries=3` do próprio SDK | O SDK já faz espera exponencial em erros temporários (429/5xx/rede) — mais fiável do que reimplementar. |
| 4 | RLS por cabeçalho HTTP `x-device-id` nas leituras | Sem contas de utilizador, o RLS compara o `device_id` da linha com o cabeçalho enviado pelo frontend — cada dispositivo só lê o que é seu, imposto na base de dados. |
| 5 | Tempo real via **Realtime Broadcast** (canal `device-<uuid>`) e não `postgres_changes` | O `postgres_changes` respeita RLS mas não recebe o cabeçalho do dispositivo no WebSocket, pelo que nunca entregaria eventos. O broadcast leva **apenas identificadores** ("campainha"); os dados são sempre lidos por REST com RLS. Canal com UUID de 122 bits, impossível de adivinhar. |
| 6 | Coluna extra `latency_ms` na tabela `conversations` | O dashboard exige "latência média"; sem guardar a latência de cada turno, a métrica não existiria. |
| 7 | Custo estimado no dashboard com preço médio de 2,2 USD/M tokens | Guardamos tokens de entrada+saída somados; usamos a média ponderada dos preços do Haiku 4.5 (entrada 1 USD/M, saída 5 USD/M). É uma estimativa, e está identificada como tal. |
| 8 | `session_id` novo por separador/arranque (sessionStorage na PWA; a cada boot no RPi) | Definição natural de "sessão de utilização"; morre quando a app fecha. |
| 9 | Deteção do comando "envia para a app" no backend, por expressão regular sem acentos | Apanha variações naturais (enviar/manda/passa + app/aplicação/telemóvel/telefone) vindas de voz ou texto, e funciona igual para a PWA e para os óculos. |
| 10 | Resumo de 1 frase gerado pelo modelo, com *fallback* local (primeira frase) | Qualidade do resumo quando a API está disponível; se falhar, o envio para a app nunca fica bloqueado. |
| 11 | STT no Raspberry Pi com **Vosk** (modelo pequeno pt) local | O backend recebe texto (não áudio) e o PythonAnywhere gratuito não permite chamar APIs de STT externas (whitelist). O Vosk é o único STT offline viável em 512 MB de RAM. |
| 12 | TTS no Raspberry Pi com **espeak-ng** (e não pyttsx3) | O pyttsx3 em Linux é apenas uma camada sobre o espeak — usar o espeak-ng diretamente elimina uma dependência e é mais estável em Raspberry Pi OS Lite. |
| 13 | Raspberry Pi OS **Lite 32-bit** | Sem ambiente gráfico e menor consumo dos 512 MB de RAM do Zero 2W. |
| 14 | Deploy no PythonAnywhere com adaptador `a2wsgi` | O PythonAnywhere usa WSGI; o FastAPI é ASGI. O `a2wsgi` faz a ponte com 2 linhas no ficheiro WSGI (ver DEPLOY.md). |
| 15 | Service worker "network-first" com cache de emergência | A interface abre offline (requisito de PWA), mas nunca serve respostas desatualizadas quando há rede. |
| 16 | Ícones da PWA gerados localmente (PNG 192/512) | Instalabilidade garantida em Chrome/Edge/Android sem depender de serviços externos. |
| 17 | Supabase Auth **não** implementado (documentado como melhoria futura) | Âmbito fechado da PAP; a identidade por `device_id` + RLS cumpre a privacidade sem contas. |
| 18 | Botão "apagar histórico" **considerado e rejeitado** | O apagamento seria irreversível e o utilizador pode arrepender-se; sem contas, não haveria forma de recuperar. Preferiu-se proteger os dados do utilizador. |
| 19 | Botão "reler resposta" (🔊), sugestões de comandos no ecrã inicial e gráfico de atividade no dashboard | Melhoram a demonstração ao vivo: reouvir respostas em salas com ruído, guiar quem experimenta a app e dar leitura visual imediata do uso. |
