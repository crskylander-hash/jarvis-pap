// ============================================================
// PROJETO JARVIS — Controlo da velocidade da voz (TTS)
// Deslizador de 0,8× a 1,5×, guardado em localStorage.
// ============================================================
import { useState } from 'react'
import { definirVelocidade, obterVelocidade } from '../servicos/vozTTS.js'

export default function ControloVelocidade() {
  const [velocidade, setVelocidade] = useState(obterVelocidade())

  const aoMudar = (evento) => {
    const v = parseFloat(evento.target.value)
    setVelocidade(v)
    definirVelocidade(v) // fica guardado para as próximas visitas
  }

  return (
    <div className="flex items-center justify-center gap-3 text-xs text-jarvis-texto/60">
      <span>Velocidade da voz</span>
      <input
        type="range"
        min="0.8"
        max="1.5"
        step="0.1"
        value={velocidade}
        onChange={aoMudar}
        className="w-40 accent-cyan-400"
      />
      <span className="w-8 text-jarvis-ciano">{velocidade.toFixed(1)}×</span>
    </div>
  )
}
