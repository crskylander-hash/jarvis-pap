// ============================================================
// PROJETO JARVIS — Controlos da voz (TTS)
// • Deslizador de velocidade (0,8×–1,5×)
// • Seletor da voz portuguesa a usar
// Ambos guardados em localStorage.
// ============================================================
import { useEffect, useState } from 'react'
import {
  definirVelocidade,
  definirVozEscolhida,
  listarVozesPortuguesas,
  obterNomeVozEscolhida,
  obterVelocidade,
} from '../servicos/vozTTS.js'

export default function ControloVelocidade() {
  const [velocidade, setVelocidade] = useState(obterVelocidade())
  const [vozes, setVozes] = useState([])
  const [vozEscolhida, setVozEscolhida] = useState(obterNomeVozEscolhida())

  // As vozes do sistema carregam de forma assíncrona — atualizamos a
  // lista quando o browser as disponibilizar ("voiceschanged")
  useEffect(() => {
    const atualizar = () => setVozes(listarVozesPortuguesas())
    atualizar()
    window.speechSynthesis.addEventListener('voiceschanged', atualizar)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', atualizar)
  }, [])

  const aoMudarVelocidade = (evento) => {
    const v = parseFloat(evento.target.value)
    setVelocidade(v)
    definirVelocidade(v) // fica guardado para as próximas visitas
  }

  const aoMudarVoz = (evento) => {
    setVozEscolhida(evento.target.value)
    definirVozEscolhida(evento.target.value)
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-jarvis-texto/60">
      {/* ----- Velocidade ----- */}
      <div className="flex items-center gap-2">
        <span>Velocidade</span>
        <input
          type="range"
          min="0.8"
          max="1.5"
          step="0.1"
          value={velocidade}
          onChange={aoMudarVelocidade}
          className="w-32 accent-cyan-400"
        />
        <span className="w-8 text-jarvis-ciano">{velocidade.toFixed(1)}×</span>
      </div>

      {/* ----- Voz ----- */}
      <div className="flex items-center gap-2">
        <span>Voz</span>
        <select
          value={vozEscolhida}
          onChange={aoMudarVoz}
          className="max-w-[180px] rounded-md border border-jarvis-borda bg-jarvis-painel px-2 py-1 text-jarvis-texto outline-none focus:border-jarvis-ciano"
        >
          <option value="">Automática (pt)</option>
          {vozes.map((v) => (
            <option key={v.name} value={v.name}>
              {v.name} ({v.lang})
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
