// ============================================================
// PROJETO JARVIS — Página de Histórico
//
// • Conversas antigas agrupadas por sessão (a atual identificada)
// • Exportar TODO o histórico para ficheiro de texto
// • Apagar TODO o histórico (com dupla confirmação — irreversível)
// ============================================================
import { useEffect, useState } from 'react'
import { apagarHistorico } from '../servicos/api.js'
import { obterSessionId } from '../servicos/dispositivo.js'
import { obterHistorico, subscreverTempoReal } from '../servicos/supabase.js'

/** Formata a data/hora em PT-PT. */
function formatarData(iso) {
  return new Date(iso).toLocaleString('pt-PT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

/** Agrupa as conversas por sessão, da mais recente para a mais antiga. */
function agruparPorSessao(linhas) {
  const grupos = new Map()
  for (const linha of linhas) {
    if (!grupos.has(linha.session_id)) grupos.set(linha.session_id, [])
    grupos.get(linha.session_id).push(linha)
  }
  return [...grupos.values()].sort(
    (a, b) => new Date(b[b.length - 1].timestamp) - new Date(a[a.length - 1].timestamp)
  )
}

export default function Historico() {
  const [sessoes, setSessoes] = useState([])
  const [abertas, setAbertas] = useState(new Set()) // sessões expandidas
  const [aCarregar, setACarregar] = useState(true)
  const [mensagemEstado, setMensagemEstado] = useState('')

  const carregar = () => {
    obterHistorico(500)
      .then((linhas) => setSessoes(agruparPorSessao(linhas)))
      .catch(() => setSessoes([]))
      .finally(() => setACarregar(false))
  }

  useEffect(() => {
    carregar()
    const cancelar = subscreverTempoReal(() => carregar()) // atualiza em tempo real
    return cancelar
  }, [])

  /** Expande/fecha uma sessão. */
  const alternar = (id) => {
    setAbertas((atual) => {
      const novo = new Set(atual)
      if (novo.has(id)) novo.delete(id)
      else novo.add(id)
      return novo
    })
  }

  /** Descarrega o histórico completo num ficheiro de texto. */
  const exportarTudo = () => {
    const blocos = sessoes.map((sessao) => {
      const cabecalho = `CONVERSA DE ${formatarData(sessao[0].timestamp)}\n${'-'.repeat(40)}`
      const corpo = sessao
        .map((c) => `EU: ${c.user_input}\n\nJARVIS: ${c.claude_response}`)
        .join('\n\n')
      return `${cabecalho}\n\n${corpo}`
    })
    const conteudo = `Histórico completo — JARVIS\n${'='.repeat(40)}\n\n${blocos.join('\n\n\n')}\n`
    const ficheiro = new Blob([conteudo], { type: 'text/plain;charset=utf-8' })
    const ligacao = document.createElement('a')
    ligacao.href = URL.createObjectURL(ficheiro)
    ligacao.download = 'historico-jarvis.txt'
    ligacao.click()
    URL.revokeObjectURL(ligacao.href)
  }

  /** Apaga tudo, com DUPLA confirmação (é irreversível). */
  const apagarTudo = async () => {
    const primeira = window.confirm(
      'Apagar TODO o histórico deste dispositivo?\n\nEsta ação é IRREVERSÍVEL — as conversas não podem ser recuperadas.'
    )
    if (!primeira) return
    const segunda = window.confirm(
      'Última confirmação: tens a certeza absoluta?\n\nDica: podes exportar o histórico antes de apagar.'
    )
    if (!segunda) return
    try {
      const { apagadas } = await apagarHistorico()
      setSessoes([])
      setMensagemEstado(`Histórico apagado (${apagadas} conversas).`)
    } catch (erro) {
      setMensagemEstado(erro.message)
    }
  }

  const sessaoAtual = obterSessionId()

  return (
    <div className="space-y-4">
      {/* ---------- Cabeçalho com as ações ---------- */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-jarvis-ciano">🕘 Histórico</h2>
        <div className="flex gap-2">
          <button
            onClick={exportarTudo}
            disabled={sessoes.length === 0}
            className="rounded-lg border border-jarvis-borda bg-jarvis-painel px-3 py-1.5 text-xs text-jarvis-texto/80 transition-colors hover:border-jarvis-ciano hover:text-jarvis-ciano disabled:opacity-40"
          >
            ⬇ Exportar tudo (.txt)
          </button>
          <button
            onClick={apagarTudo}
            disabled={sessoes.length === 0}
            className="rounded-lg border border-red-900/60 bg-jarvis-painel px-3 py-1.5 text-xs text-red-400/90 transition-colors hover:border-red-400 hover:text-red-300 disabled:opacity-40"
          >
            🗑 Apagar tudo
          </button>
        </div>
      </div>

      {mensagemEstado && (
        <p className="rounded-lg border border-jarvis-borda bg-jarvis-painel px-3 py-2 text-sm text-jarvis-ciano">
          {mensagemEstado}
        </p>
      )}

      {aCarregar && <p className="text-sm text-jarvis-texto/50">A carregar…</p>}

      {!aCarregar && sessoes.length === 0 && !mensagemEstado && (
        <p className="pt-10 text-center text-sm text-jarvis-texto/50">
          Ainda não há conversas guardadas neste dispositivo.
        </p>
      )}

      {/* ---------- Sessões (conversas), da mais recente para a mais antiga ---------- */}
      {sessoes.map((sessao) => {
        const id = sessao[0].session_id
        const aberta = abertas.has(id)
        const eAtual = id === sessaoAtual
        return (
          <div key={id} className="overflow-hidden rounded-2xl border border-jarvis-borda bg-jarvis-painel">
            {/* Cabeçalho clicável da sessão */}
            <button
              onClick={() => alternar(id)}
              className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-jarvis-fundo/40"
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-jarvis-texto/90">
                  {eAtual && <span className="mr-2 rounded-full bg-jarvis-ciano/15 px-2 py-0.5 text-xs text-jarvis-ciano">atual</span>}
                  «{sessao[0].user_input}»
                </p>
                <p className="mt-0.5 text-xs text-jarvis-texto/40">
                  {formatarData(sessao[0].timestamp)} · {sessao.length} interações
                </p>
              </div>
              <span className="ml-3 text-jarvis-ciano">{aberta ? '▾' : '▸'}</span>
            </button>

            {/* Conteúdo da sessão */}
            {aberta && (
              <div className="space-y-3 border-t border-jarvis-borda px-4 py-3">
                {sessao.map((c) => (
                  <div key={c.id} className="text-sm">
                    <p className="text-jarvis-ciano/90">🗣 {c.user_input}</p>
                    <p className="mt-1 whitespace-pre-wrap text-jarvis-texto/80">🤖 {c.claude_response}</p>
                    <p className="mt-1 text-xs text-jarvis-texto/35">
                      {formatarData(c.timestamp)}
                      {c.display_mode === 'app' && ' · 📱 enviada para a app'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
