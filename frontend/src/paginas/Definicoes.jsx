// ============================================================
// PROJETO JARVIS — Página de Definições
//
// • Idioma da conversa, velocidade e voz (ControloVelocidade)
// • Modo mãos-livres: escuta contínua com a wake word «JARVIS»
// • Nota sobre como instalar mais vozes no dispositivo
// ============================================================
import { useState } from 'react'
import ControloVelocidade from '../componentes/ControloVelocidade.jsx'
import { definirMaosLivres, maosLivresAtivo } from '../servicos/definicoes.js'

/** Secção com título e conteúdo. */
function Seccao({ titulo, children }) {
  return (
    <section className="rounded-2xl border border-jarvis-borda bg-jarvis-painel p-5">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-jarvis-ciano">
        {titulo}
      </h3>
      {children}
    </section>
  )
}

export default function Definicoes() {
  const [maosLivres, setMaosLivres] = useState(maosLivresAtivo())

  const alternarMaosLivres = () => {
    const novo = !maosLivres
    setMaosLivres(novo)
    definirMaosLivres(novo) // a página Conversa lê isto ao abrir
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-jarvis-ciano">⚙ Definições</h2>

      <Seccao titulo="Voz e idioma">
        {/* Idioma da conversa + velocidade + voz (guardados automaticamente) */}
        <ControloVelocidade />
        <p className="mt-3 text-xs leading-relaxed text-jarvis-texto/50">
          💡 As vozes disponíveis dependem do teu dispositivo. No Windows podes
          instalar mais em: Definições → Hora e idioma → Voz → «Adicionar vozes».
          No Android, em: Definições → Sistema → Idiomas → Saída de texto para voz.
        </p>
      </Seccao>

      <Seccao titulo="Modo mãos-livres (wake word)">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm leading-relaxed text-jarvis-texto/80">
            Com o modo mãos-livres ligado, a conversa começa a escutar sozinha e
            o JARVIS acorda quando dizes <strong className="text-jarvis-ciano">«JARVIS»</strong> —
            sem tocar em nada. Tolera erros de pronúncia («jarvi», «jarves»…).
          </p>
          <button
            onClick={alternarMaosLivres}
            className={[
              'shrink-0 rounded-full border px-4 py-2 text-xs font-medium transition-colors',
              maosLivres
                ? 'border-jarvis-ciano bg-jarvis-ciano/15 text-jarvis-ciano'
                : 'border-jarvis-borda text-jarvis-texto/60 hover:text-jarvis-ciano',
            ].join(' ')}
          >
            {maosLivres ? 'Ligado' : 'Desligado'}
          </button>
        </div>
        <p className="mt-3 text-xs text-jarvis-texto/50">
          Nota: por privacidade, no modo mãos-livres nada é enviado ao servidor
          até a wake word ser detetada — a escuta é feita no teu dispositivo.
        </p>
      </Seccao>

      <Seccao titulo="Voz personalizada — funcionalidade desenhada 🔬">
        <p className="text-sm leading-relaxed text-jarvis-texto/70">
          Em desenvolvimento futuro: usar a <strong className="text-jarvis-ciano">tua própria voz</strong> como
          voz do JARVIS. O plano técnico já está definido:
        </p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-jarvis-texto/60">
          <li>Gravas ~60 segundos de leitura aqui nas Definições;</li>
          <li>Um serviço de síntese neural treina um clone da tua voz (com o teu consentimento explícito);</li>
          <li>As respostas passam a ser faladas com a tua voz, natural e sem som robótico.</li>
        </ol>
        <p className="mt-2 text-xs text-jarvis-texto/45">
          Não está ativa nesta versão: a tecnologia do browser não suporta vozes
          personalizadas e a clonagem neural exige serviços externos pagos —
          decisão documentada no projeto (privacidade e consentimento em primeiro lugar).
        </p>
      </Seccao>

      <Seccao titulo="Privacidade e dados">
        <p className="text-sm leading-relaxed text-jarvis-texto/80">
          O JARVIS não pede conta, email nem nome. A tua identidade é um código
          anónimo guardado só neste dispositivo, e a base de dados impede
          qualquer outro dispositivo de ler as tuas conversas (Row Level
          Security). Podes exportar ou apagar o teu histórico a qualquer
          momento na página <strong className="text-jarvis-ciano">Histórico</strong>.
        </p>
      </Seccao>
    </div>
  )
}
