// ============================================================
// PROJETO JARVIS — Dashboard de métricas em tempo real
//
// • Nº de conversas, tokens usados, latência média e custo estimado
// • Indicador online/offline do backend (GET /health a cada 30 s)
// • Histórico recente
// • Atualização automática via Supabase Realtime (broadcast)
// ============================================================
import { useEffect, useState } from 'react'
import { verificarSaude } from '../servicos/api.js'
import { obterHistorico, subscreverTempoReal } from '../servicos/supabase.js'

// Preço médio estimado do claude-haiku-4-5 por token (USD).
// (mistura de entrada $1/M e saída $5/M — ver DECISOES.md)
const PRECO_MEDIO_POR_TOKEN_USD = 2.2e-6

/** Gráfico de barras simples: conversas por dia, últimos 7 dias.
 *  Feito só com divs + Tailwind (sem bibliotecas externas). */
function GraficoAtividade({ conversas }) {
  // Prepara os últimos 7 dias (do mais antigo para hoje)
  const dias = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    dias.push({
      chave: d.toISOString().slice(0, 10),            // "2026-07-07"
      rotulo: d.toLocaleDateString('pt-PT', { weekday: 'short' }), // "seg."
      total: 0,
    })
  }
  // Conta as conversas de cada dia
  for (const c of conversas) {
    const chave = String(c.timestamp).slice(0, 10)
    const dia = dias.find((d) => d.chave === chave)
    if (dia) dia.total++
  }
  const maximo = Math.max(1, ...dias.map((d) => d.total))

  return (
    <div className="rounded-2xl border border-jarvis-borda bg-jarvis-painel p-4">
      <p className="mb-3 text-xs uppercase tracking-wider text-jarvis-texto/50">
        Atividade dos últimos 7 dias
      </p>
      <div className="flex h-28 items-end justify-between gap-2">
        {dias.map((d) => (
          <div key={d.chave} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-xs text-jarvis-ciano">{d.total > 0 ? d.total : ''}</span>
            <div
              className="w-full rounded-t bg-jarvis-ciano/60 transition-all"
              style={{ height: `${(d.total / maximo) * 80}px`, minHeight: d.total > 0 ? '4px' : '1px' }}
              title={`${d.total} conversa(s)`}
            />
            <span className="text-[10px] text-jarvis-texto/50">{d.rotulo}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Cartão de métrica simples. */
function Cartao({ titulo, valor, unidade }) {
  return (
    <div className="rounded-2xl border border-jarvis-borda bg-jarvis-painel p-4">
      <p className="text-xs uppercase tracking-wider text-jarvis-texto/50">{titulo}</p>
      <p className="mt-1 text-2xl font-semibold text-jarvis-ciano">
        {valor}
        {unidade && <span className="ml-1 text-sm text-jarvis-texto/60">{unidade}</span>}
      </p>
    </div>
  )
}

export default function Dashboard() {
  const [conversas, setConversas] = useState([])
  const [online, setOnline] = useState(null) // null = a verificar

  const carregar = () => {
    obterHistorico(200).then(setConversas).catch(() => setConversas([]))
  }

  // Histórico + atualização em tempo real
  useEffect(() => {
    carregar()
    const cancelar = subscreverTempoReal(() => carregar())
    return cancelar
  }, [])

  // Indicador online/offline: verifica o /health a cada 30 segundos
  useEffect(() => {
    const verificar = () => verificarSaude().then(setOnline)
    verificar()
    const intervalo = setInterval(verificar, 30000)
    return () => clearInterval(intervalo)
  }, [])

  // ----- Cálculo das métricas a partir das conversas -----
  const totalConversas = conversas.length
  const totalTokens = conversas.reduce((soma, c) => soma + (c.tokens_used || 0), 0)
  const comLatencia = conversas.filter((c) => c.latency_ms > 0)
  const latenciaMedia = comLatencia.length
    ? Math.round(comLatencia.reduce((s, c) => s + c.latency_ms, 0) / comLatencia.length)
    : 0
  const custoEstimado = (totalTokens * PRECO_MEDIO_POR_TOKEN_USD).toFixed(4)

  return (
    <div className="space-y-5">
      {/* ---------- Estado do sistema ---------- */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-jarvis-ciano">Dashboard</h2>
        <span
          className={[
            'flex items-center gap-2 rounded-full px-3 py-1 text-xs',
            online === null
              ? 'bg-jarvis-painel text-jarvis-texto/50'
              : online
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'bg-red-500/10 text-red-400',
          ].join(' ')}
        >
          <span className={[
            'h-2 w-2 rounded-full',
            online === null ? 'bg-jarvis-texto/40' : online ? 'animate-pulse bg-emerald-400' : 'bg-red-400',
          ].join(' ')} />
          {online === null ? 'A verificar…' : online ? 'Sistema online' : 'Sistema offline'}
        </span>
      </div>

      {/* ---------- Cartões de métricas ---------- */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Cartao titulo="Conversas" valor={totalConversas} />
        <Cartao titulo="Tokens usados" valor={totalTokens.toLocaleString('pt-PT')} />
        <Cartao titulo="Latência média" valor={latenciaMedia} unidade="ms" />
        <Cartao titulo="Custo estimado" valor={custoEstimado} unidade="USD" />
      </div>

      {/* ---------- Gráfico de atividade ---------- */}
      <GraficoAtividade conversas={conversas} />

      {/* ---------- Histórico recente ---------- */}
      <div className="rounded-2xl border border-jarvis-borda bg-jarvis-painel">
        <p className="border-b border-jarvis-borda px-4 py-3 text-xs uppercase tracking-wider text-jarvis-texto/50">
          Histórico recente
        </p>
        {conversas.length === 0 ? (
          <p className="p-4 text-sm text-jarvis-texto/50">Sem conversas registadas neste dispositivo.</p>
        ) : (
          <ul className="divide-y divide-jarvis-borda">
            {[...conversas].reverse().slice(0, 15).map((c) => (
              <li key={c.id} className="px-4 py-3 text-sm">
                <p className="text-jarvis-ciano/90">🗣 {c.user_input}</p>
                <p className="mt-1 line-clamp-2 text-jarvis-texto/70">🤖 {c.claude_response}</p>
                <p className="mt-1 text-xs text-jarvis-texto/40">
                  {new Date(c.timestamp).toLocaleString('pt-PT')}
                  {' · '}{c.tokens_used} tokens · {c.latency_ms} ms
                  {c.display_mode === 'app' && ' · 📱 app'}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
