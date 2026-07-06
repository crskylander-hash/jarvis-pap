// ============================================================
// PROJETO JARVIS — Bolha de mensagem da conversa
// Utilizador à direita (ciano), JARVIS à esquerda (painel escuro).
// ============================================================
export default function BolhaMensagem({ papel, texto, paraApp }) {
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
        {/* Etiqueta quando a resposta foi enviada para a vista de leitura */}
        {paraApp && (
          <span className="mt-1 block text-xs text-jarvis-ciano/70">📱 enviada para a app</span>
        )}
      </div>
    </div>
  )
}
