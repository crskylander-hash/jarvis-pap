-- ============================================================
-- PROJETO JARVIS — Esquema da base de dados (Supabase/PostgreSQL)
-- Autor: Carlos Rafael Resendes Silva — PAP 2026
--
-- COMO USAR: copiar este ficheiro inteiro e colar no
-- SQL Editor do Supabase (Dashboard > SQL Editor > New query > Run).
-- ============================================================

-- ------------------------------------------------------------
-- TABELA conversations — cada linha é um "turno" completo:
-- a pergunta do utilizador + a resposta do JARVIS.
-- ------------------------------------------------------------
create table if not exists public.conversations (
  id              uuid primary key default gen_random_uuid(), -- identificador único da linha
  device_id       text not null,                              -- identidade anónima do dispositivo (UUID gerado no frontend)
  session_id      text not null,                              -- sessão de utilização (UUID gerado a cada visita)
  user_input      text not null,                              -- o que o utilizador disse/escreveu
  claude_response text not null,                              -- a resposta do JARVIS
  display_mode    text not null default 'voice',              -- 'voice' = resposta falada | 'app' = enviada para a app (vista de leitura)
  timestamp       timestamptz not null default now(),         -- data/hora do turno
  tokens_used     integer not null default 0,                 -- tokens gastos na chamada à API (entrada + saída)
  latency_ms      integer not null default 0                  -- latência da resposta em milissegundos (para a métrica do dashboard)
);

-- Índice para acelerar a consulta mais frequente:
-- "últimos N turnos deste dispositivo, do mais recente para o mais antigo"
create index if not exists idx_conversations_device_tempo
  on public.conversations (device_id, timestamp desc);

-- ------------------------------------------------------------
-- TABELA sessions — agrega estatísticas por sessão de utilização
-- ------------------------------------------------------------
create table if not exists public.sessions (
  id             text primary key,                 -- session_id gerado no frontend (UUID em texto)
  device_id      text not null,                    -- dispositivo a que a sessão pertence
  started_at     timestamptz not null default now(), -- início da sessão
  ended_at       timestamptz,                      -- última atividade registada
  total_messages integer not null default 0        -- número de mensagens trocadas na sessão
);

create index if not exists idx_sessions_device
  on public.sessions (device_id);

-- ------------------------------------------------------------
-- TABELA system_logs — registo de eventos do sistema
-- (arranques, erros da API, envios para a app, etc.)
-- ------------------------------------------------------------
create table if not exists public.system_logs (
  id         uuid primary key default gen_random_uuid(),
  event_type text not null,          -- tipo de evento: 'arranque', 'erro_api', 'envio_app', ...
  message    text,                   -- descrição do evento
  created_at timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) — privacidade imposta na base de dados
--
-- Estratégia (sem contas de utilizador):
--  • O frontend envia sempre o cabeçalho HTTP "x-device-id" com o
--    UUID do dispositivo (configurado no cliente supabase-js).
--  • As políticas de leitura só devolvem linhas cujo device_id
--    coincide com esse cabeçalho — cada dispositivo só lê o que é seu.
--  • NÃO existem políticas de escrita para o papel "anon": toda a
--    escrita é feita pelo backend com a service key (que ignora RLS).
-- ============================================================

alter table public.conversations enable row level security;
alter table public.sessions      enable row level security;
alter table public.system_logs   enable row level security;

-- Leitura de conversas: apenas as linhas do próprio dispositivo
create policy "leitura_apenas_do_proprio_device"
  on public.conversations
  for select
  to anon
  using (
    device_id = coalesce(
      (current_setting('request.headers', true))::json ->> 'x-device-id',
      ''
    )
  );

-- Leitura de sessões: apenas as do próprio dispositivo
create policy "sessoes_apenas_do_proprio_device"
  on public.sessions
  for select
  to anon
  using (
    device_id = coalesce(
      (current_setting('request.headers', true))::json ->> 'x-device-id',
      ''
    )
  );

-- system_logs: SEM políticas para "anon" — só o backend (service key) acede.

-- NOTA: não são criadas políticas de INSERT/UPDATE/DELETE para "anon",
-- logo qualquer tentativa de escrita com a chave pública é recusada.
-- O backend usa a SERVICE KEY, que ignora o RLS — é o único que escreve.
