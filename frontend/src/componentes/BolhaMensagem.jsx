// ============================================================
// PROJETO JARVIS — Bolha de mensagem da conversa
// Utilizador à direita (ciano), JARVIS à esquerda (painel escuro).
// As respostas do JARVIS têm um botão 🔊 para voltar a ouvir.
// ============================================================
export default function BolhaMensagem({ papel, texto, paraApp, aoReler }) {
  const eUtilizador = papel === 'utilizador'
  return (
    <div className={eUtilizador ? 'flex justify-end' : 'flex justify-start'}>
      <div
        className={[
          'max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm leading-relaxed',
          eUtilizador
            ? 'rounded-br-sm bg-jarvis-ciano/15 text-jarvis-ciano'
            : 'rounded-bl-sm border border-jarvis-borda bg-jarvis-painel',
        ].join(' ')}
      >
        {texto}
        {/* Rodapé da bolha: etiqueta "enviada para a app" + botão de reler */}
        {(paraApp || (!eUtilizador && aoReler)) && (
          <span className="mt-1 flex items-center gap-3 text-xs text-jarvis-ciano/70">
            {paraApp && <span>📱 enviada para a app</span>}
            {!eUtilizador && aoReler && (
              <button
                onClick={aoReler}
                title="Voltar a ouvir esta resposta"
                className="rounded px-1 transition-colors hover:text-jarvis-ciano"
              >
                🔊 reler
              </button>
            )}
          </span>
        )}
      </div>
    </div>
  )
}
