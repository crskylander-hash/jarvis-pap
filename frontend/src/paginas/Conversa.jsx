// ============================================================
// PROJETO JARVIS — Página principal: conversa por voz e texto
//
// • Botão central: clique-para-falar (Web Speech API, pt-PT)
// • Interruptor "mãos-livres": escuta contínua com wake word "JARVIS"
// • As respostas são faladas (TTS) e podem ser interrompidas
// • Campo de texto como alternativa ao microfone
// ============================================================
import { useCallback, useEffect, useRef, useState } from 'react'
import { enviarMensagem } from '../servicos/api.js'
import { obterHistorico, subscreverTempoReal } from '../servicos/supabase.js'
import { useReconhecimentoVoz, suportaReconhecimento } from '../servicos/vozSTT.js'
import * as tts from '../servicos/vozTTS.js'
import BolhaMensagem from '../componentes/BolhaMensagem.jsx'
import ControloVelocidade from '../componentes/ControloVelocidade.jsx'

// Sugestões mostradas quando a conversa está vazia (guiam a demonstração)
const SUGESTOES = [
  'Quem és tu?',
  'Conta-me uma curiosidade sobre o espaço',
  'Explica-me a Revolução dos Cravos em detalhe',
  'O que consegues fazer?',
]

export default function Conversa() {
  const [mensagens, setMensagens] = useState([])       // conversa no ecrã
  const [aProcessar, setAProcessar] = useState(false)  // à espera do backend
  const [aFalar, setAFalar] = useState(false)          // TTS em curso
  const [erro, setErro] = useState('')
  const [textoEscrito, setTextoEscrito] = useState('')
  const refFundo = useRef(null)

  // ----- Carrega o histórico deste dispositivo ao abrir -----
  useEffect(() => {
    obterHistorico()
      .then((linhas) =>
        setMensagens(
          linhas.flatMap((l) => [
            { papel: 'utilizador', texto: l.user_input },
            { papel: 'jarvis', texto: l.claude_response, paraApp: l.display_mode === 'app' },
          ])
        )
      )
      .catch(() => { /* sem Supabase configurado, a conversa começa vazia */ })
  }, [])

  // ----- Notificações em tempo real (ex.: resposta enviada para a app) -----
  useEffect(() => {
    const cancelar = subscreverTempoReal((evento) => {
      if (evento === 'resposta_para_app' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification('JARVIS', { body: 'Tens uma resposta nova na app 📱', icon: '/icons/icon-192.png' })
        }
      }
    })
    return cancelar
  }, [])

  // ----- Scroll automático para a última mensagem -----
  useEffect(() => {
    refFundo.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens, aProcessar])

  // ----- Envio de uma pergunta ao JARVIS -----
  const enviar = useCallback(async (texto) => {
    const limpo = texto.trim()
    if (!limpo) return
    tts.parar()               // se estava a falar, cala-se para ouvir
    setAFalar(false)
    setErro('')
    setMensagens((m) => [...m, { papel: 'utilizador', texto: limpo }])
    setAProcessar(true)

    try {
      const r = await enviarMensagem(limpo)
      setMensagens((m) => [...m, {
        papel: 'jarvis', texto: r.resposta, paraApp: r.display_mode === 'app',
      }])
      // Fala a resposta em voz alta
      setAFalar(true)
      tts.falar(r.resposta, () => setAFalar(false))
    } catch (excecao) {
      setErro(excecao.message)
    } finally {
      setAProcessar(false)
    }
  }, [])

  // ----- Reconhecimento de voz (hook) -----
  const voz = useReconhecimentoVoz(enviar)

  // Pede permissão de notificações na primeira interação
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  const enviarTexto = (evento) => {
    evento.preventDefault()
    enviar(textoEscrito)
    setTextoEscrito('')
  }

  return (
    <div className="flex h-[calc(100vh-160px)] flex-col">
      {/* ---------- Zona de mensagens ---------- */}
      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {mensagens.length === 0 && (
          <div className="pt-12 text-center">
            <p className="text-sm text-jarvis-texto/50">
              Diz «JARVIS» no modo mãos-livres, toca no anel para falar,
              <br />ou escreve a tua pergunta em baixo.
            </p>
            {/* Sugestões clicáveis para começar a conversa */}
            <div className="mx-auto mt-6 flex max-w-md flex-wrap justify-center gap-2">
              {SUGESTOES.map((s) => (
                <button
                  key={s}
                  onClick={() => enviar(s)}
                  className="rounded-full border border-jarvis-borda bg-jarvis-painel px-3 py-1.5 text-xs text-jarvis-texto/70 transition-colors hover:border-jarvis-ciano hover:text-jarvis-ciano"
                >
                  💡 {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {mensagens.map((m, i) => (
          <BolhaMensagem
            key={i}
            papel={m.papel}
            texto={m.texto}
            paraApp={m.paraApp}
            aoReler={
              m.papel === 'jarvis'
                ? () => { setAFalar(true); tts.falar(m.texto, () => setAFalar(false)) }
                : undefined
            }
          />
        ))}
        {aProcessar && (
          <p className="animate-pulse text-sm text-jarvis-ciano">O JARVIS está a pensar…</p>
        )}
        {erro && <p className="text-sm text-red-400">{erro}</p>}
        <div ref={refFundo} />
      </div>

      {/* ---------- Feedback da transcrição em direto ---------- */}
      {(voz.transcricao || voz.wakeDetetada) && (
        <p className="py-1 text-center text-sm italic text-jarvis-ciano/80">
          {voz.wakeDetetada && !voz.transcricao ? 'Sim? Diz lá…' : voz.transcricao}
        </p>
      )}

      {/* ---------- Controlos de voz ---------- */}
      <div className="flex items-center justify-center gap-6 py-4">
        {/* Interruptor mãos-livres (wake word) */}
        <button
          onClick={voz.alternarMaosLivres}
          disabled={!suportaReconhecimento}
          title="Escuta contínua: ativa dizendo «JARVIS»"
          className={[
            'rounded-lg border px-3 py-2 text-xs transition-colors',
            voz.maosLivres
              ? 'border-jarvis-ciano bg-jarvis-painel text-jarvis-ciano'
              : 'border-jarvis-borda text-jarvis-texto/60 hover:text-jarvis-ciano',
          ].join(' ')}
        >
          {voz.maosLivres ? '🎙 Mãos-livres ON' : '🎙 Mãos-livres OFF'}
        </button>

        {/* Botão central: anel estilo "reator" — clique para falar */}
        <button
          onClick={voz.aEscutar && !voz.maosLivres ? voz.pararEscuta : voz.comecarEscuta}
          disabled={!suportaReconhecimento}
          title={suportaReconhecimento ? 'Clica e fala' : 'Este browser não suporta reconhecimento de voz'}
          className={[
            'flex h-20 w-20 items-center justify-center rounded-full border-2 text-3xl transition-all',
            voz.aEscutar
              ? 'animate-pulso border-jarvis-ciano bg-jarvis-ciano/10 text-jarvis-ciano'
              : 'border-jarvis-borda bg-jarvis-painel text-jarvis-texto/70 hover:border-jarvis-ciano hover:text-jarvis-ciano',
          ].join(' ')}
        >
          {voz.aEscutar ? '●' : '🎤'}
        </button>

        {/* Botão para interromper a fala do JARVIS */}
        <button
          onClick={() => { tts.parar(); setAFalar(false) }}
          disabled={!aFalar}
          className={[
            'rounded-lg border px-3 py-2 text-xs transition-colors',
            aFalar
              ? 'border-jarvis-ciano text-jarvis-ciano'
              : 'border-jarvis-borda text-jarvis-texto/30',
          ].join(' ')}
        >
          ⏹ Silenciar
        </button>
      </div>

      {/* ---------- Velocidade da voz ---------- */}
      <ControloVelocidade />

      {/* ---------- Entrada por texto (alternativa ao microfone) ---------- */}
      <form onSubmit={enviarTexto} className="flex gap-2 pt-3">
        <input
          value={textoEscrito}
          onChange={(e) => setTextoEscrito(e.target.value)}
          placeholder="Ou escreve aqui a tua pergunta…"
          className="flex-1 rounded-lg border border-jarvis-borda bg-jarvis-painel px-4 py-2 text-sm outline-none placeholder:text-jarvis-texto/40 focus:border-jarvis-ciano"
        />
        <button
          type="submit"
          disabled={aProcessar || !textoEscrito.trim()}
          className="rounded-lg border border-jarvis-borda bg-jarvis-painel px-4 py-2 text-sm text-jarvis-ciano transition-colors hover:border-jarvis-ciano disabled:opacity-40"
        >
          Enviar
        </button>
      </form>
    </div>
  )
}
