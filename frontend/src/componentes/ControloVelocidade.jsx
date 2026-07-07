// ============================================================
// PROJETO JARVIS — Controlos da voz e do idioma
// • Idioma da conversa (reconhecimento + voz + língua da resposta)
// • Deslizador de velocidade (0,8×–1,5×)
// • Seletor da voz (filtrado pelo idioma escolhido)
// Tudo guardado em localStorage.
// ============================================================
import { useEffect, useState } from 'react'
import {
  IDIOMAS,
  definirIdioma,
  definirVelocidade,
  definirVozEscolhida,
  listarVozesDoIdioma,
  obterIdioma,
  obterNomeVozEscolhida,
  obterVelocidade,
} from '../servicos/vozTTS.js'

export default function ControloVelocidade() {
  const [velocidade, setVelocidade] = useState(obterVelocidade())
  const [idioma, setIdioma] = useState(obterIdioma())
  const [vozes, setVozes] = useState([])
  const [vozEscolhida, setVozEscolhida] = useState(obterNomeVozEscolhida())

  // As vozes do sistema carregam de forma assíncrona — atualizamos a
  // lista quando o browser as disponibilizar e quando o idioma muda
  useEffect(() => {
    const atualizar = () => setVozes(listarVozesDoIdioma())
    atualizar()
    window.speechSynthesis.addEventListener('voiceschanged', atualizar)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', atualizar)
  }, [idioma])

  const aoMudarVelocidade = (evento) => {
    const v = parseFloat(evento.target.value)
    setVelocidade(v)
    definirVelocidade(v) // fica guardado para as próximas visitas
  }

  const aoMudarIdioma = (evento) => {
    const codigo = evento.target.value
    setIdioma(codigo)
    definirIdioma(codigo)  // limpa também a voz escolhida (volta à automática)
    setVozEscolhida('')
  }

  const aoMudarVoz = (evento) => {
    setVozEscolhida(evento.target.value)
    definirVozEscolhida(evento.target.value)
  }

  const estiloSelect =
    'rounded-md border border-jarvis-borda bg-jarvis-painel px-2 py-1 text-jarvis-texto outline-none focus:border-jarvis-ciano'

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-jarvis-texto/60">
      {/* ----- Idioma da conversa ----- */}
      <div className="flex items-center gap-2">
        <span>Idioma</span>
        <select value={idioma} onChange={aoMudarIdioma} className={estiloSelect}>
          {IDIOMAS.map((i) => (
            <option key={i.codigo} value={i.codigo}>{i.nome}</option>
          ))}
        </select>
      </div>

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
          className="w-28 accent-cyan-400"
        />
        <span className="w-8 text-jarvis-ciano">{velocidade.toFixed(1)}×</span>
      </div>

      {/* ----- Voz (as disponíveis para o idioma escolhido) ----- */}
      <div className="flex items-center gap-2">
        <span>Voz</span>
        <select value={vozEscolhida} onChange={aoMudarVoz} className={`${estiloSelect} max-w-[170px]`}>
          <option value="">Automática</option>
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
