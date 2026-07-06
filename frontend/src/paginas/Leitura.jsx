// ============================================================
// PROJETO JARVIS — Vista de leitura ("enviado para a app")
//
// Mostra as respostas que o utilizador pediu para enviar para a
// app (display_mode='app'). Atualiza sozinha via Supabase Realtime
// e mostra uma notificação quando chega uma resposta nova.
// ============================================================
import { useEffect, useState } from 'react'
import { obterRespostasParaApp, subscreverTempoReal } from '../servicos/supabase.js'

/** Formata a data/hora em PT-PT (ex.: "06/07/2026, 14:32"). */
function formatarData(iso) {
  return new Date(iso).toLocaleString('pt-PT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function Leitura() {
  const [respostas, setRespostas] = useState([])
  const [aCarregar, setACarregar] = useState(true)
  const [novaChegada, setNovaChegada] = useState(false) // aviso visual no topo

  const carregar = () => {
    obterRespostasParaApp()
      .then(setRespostas)
      .catch(() => setRespostas([]))
      .finally(() => setACarregar(false))
  }

  useEffect(() => {
    carregar()
    // Tempo real: quando o backend marca uma resposta para a app,
    // recarregamos a lista e destacamos a novidade
    const cancelar = subscreverTempoReal((evento) => {
      if (evento === 'resposta_para_app') {
        setNovaChegada(true)
        carregar()
        setTimeout(() => setNovaChegada(false), 4000)
      }
    })
    return cancelar
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-jarvis-ciano">📱 Enviado para a app</h2>
        {novaChegada && (
          <span className="animate-pulse rounded-full bg-jarvis-ciano/15 px-3 py-1 text-xs text-jarvis-ciano">
            Resposta nova recebida!
          </span>
        )}
      </div>

      {aCarregar && <p className="text-sm text-jarvis-texto/50">A carregar…</p>}

      {!aCarregar && respostas.length === 0 && (
        <p className="pt-10 text-center text-sm text-jarvis-texto/50">
          Ainda não enviaste nada para a app.
          <br />Experimenta dizer: «JARVIS, envia isso para a app».
        </p>
      )}

      {/* Cada resposta numa "folha" de leitura confortável */}
      {respostas.map((r) => (
        <article
          key={r.id}
          className="rounded-2xl border border-jarvis-borda bg-jarvis-painel p-5"
        >
          <header className="mb-3 flex items-center justify-between text-xs text-jarvis-texto/50">
            <span className="italic">«{r.user_input}»</span>
            <time>{formatarData(r.timestamp)}</time>
          </header>
          <div className="whitespace-pre-wrap text-[15px] leading-7">
            {r.claude_response}
          </div>
        </article>
      ))}
    </div>
  )
}
