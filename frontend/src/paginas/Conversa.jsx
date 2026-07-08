// ============================================================
// PROJETO JARVIS — Página principal: conversa por voz e texto
//
// • Mostra APENAS a conversa atual (as antigas vivem no Histórico)
// • Botão central: clique-para-falar (Web Speech API)
// • Modo mãos-livres com wake word «JARVIS»: liga-se nas Definições
// • Anexos: imagens (o JARVIS vê e analisa) e ficheiros .txt
// • Botão «nova conversa»: arquiva a atual no Histórico
// ============================================================
import { useCallback, useEffect, useRef, useState } from 'react'
import { enviarMensagem } from '../servicos/api.js'
import { novaSessao, obterSessionId } from '../servicos/dispositivo.js'
import { maosLivresAtivo } from '../servicos/definicoes.js'
import { obterConversasDaSessao, subscreverTempoReal } from '../servicos/supabase.js'
import { useReconhecimentoVoz, suportaReconhecimento } from '../servicos/vozSTT.js'
import * as tts from '../servicos/vozTTS.js'
import BolhaMensagem from '../componentes/BolhaMensagem.jsx'

// Sugestões mostradas quando a conversa está vazia (guiam a demonstração)
const SUGESTOES = [
  'Quem és tu?',
  'Conta-me uma curiosidade sobre o espaço',
  'Explica-me a Revolução dos Cravos em detalhe',
  'O que consegues fazer?',
]

// Tipos de imagem que o modelo consegue analisar + limite de tamanho
const TIPOS_IMAGEM = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const TAMANHO_MAXIMO = 3.5 * 1024 * 1024 // 3,5 MB

export default function Conversa() {
  const [mensagens, setMensagens] = useState([])       // conversa ATUAL no ecrã
  const [aProcessar, setAProcessar] = useState(false)  // à espera do backend
  const [aFalar, setAFalar] = useState(false)          // TTS em curso
  const [erro, setErro] = useState('')
  const [textoEscrito, setTextoEscrito] = useState('')
  const [anexo, setAnexo] = useState(null)             // { nome, tipo, base64 } (imagem)
  const refFundo = useRef(null)
  const refFicheiro = useRef(null)

  // ----- Carrega SÓ a conversa da sessão atual ao abrir -----
  useEffect(() => {
    obterConversasDaSessao(obterSessionId())
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
    let limpo = texto.trim()
    if (!limpo && !anexo) return
    if (!limpo) limpo = 'Descreve esta imagem.' // imagem enviada sem pergunta
    tts.parar()               // se estava a falar, cala-se para ouvir
    setAFalar(false)
    setErro('')
    const anexoAEnviar = anexo // captura o anexo atual (se existir)
    setAnexo(null)
    setMensagens((m) => [...m, {
      papel: 'utilizador',
      texto: limpo + (anexoAEnviar ? ` 📎[${anexoAEnviar.nome}]` : ''),
    }])
    setAProcessar(true)

    try {
      const r = await enviarMensagem(limpo, anexoAEnviar)
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
  }, [anexo])

  // ----- Reconhecimento de voz (hook) -----
  const voz = useReconhecimentoVoz(enviar)

  // Se o modo mãos-livres estiver ligado nas Definições, começa a escutar sozinho
  useEffect(() => {
    if (maosLivresAtivo() && suportaReconhecimento) {
      voz.alternarMaosLivres()
    }
    // (a limpeza é feita dentro do próprio hook ao desmontar)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Pede permissão de notificações na primeira interação
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // ----- Nova conversa: a atual fica arquivada no Histórico -----
  const comecarNovaConversa = () => {
    tts.parar()
    setAFalar(false)
    novaSessao()          // session_id novo — as mensagens antigas ficam no Histórico
    setMensagens([])
    setErro('')
    setAnexo(null)
  }

  // ----- Escolha de anexo (imagem para o JARVIS ver, ou .txt) -----
  const aoEscolherFicheiro = (evento) => {
    const ficheiro = evento.target.files?.[0]
    evento.target.value = '' // permite escolher o mesmo ficheiro outra vez
    if (!ficheiro) return
    setErro('')

    // Ficheiro de texto: o conteúdo entra na própria mensagem
    if (ficheiro.type === 'text/plain' || ficheiro.name.endsWith('.txt')) {
      ficheiro.text().then((conteudo) => {
        const excerto = conteudo.slice(0, 3000) // respeita o limite do backend
        setTextoEscrito((t) =>
          `${t ? t + '\n\n' : ''}[Conteúdo de ${ficheiro.name}]\n${excerto}`.slice(0, 3900)
        )
      })
      return
    }

    // Imagem: validar tipo e tamanho, converter para base64
    if (!TIPOS_IMAGEM.includes(ficheiro.type)) {
      setErro('Anexos suportados: imagens (JPG, PNG, WEBP, GIF) e ficheiros .txt.')
      return
    }
    if (ficheiro.size > TAMANHO_MAXIMO) {
      setErro('Imagem demasiado grande (máximo 3,5 MB).')
      return
    }
    const leitor = new FileReader()
    leitor.onload = () => {
      // O resultado vem como "data:image/png;base64,XXXX" — queremos só o XXXX
      const base64 = String(leitor.result).split(',')[1]
      setAnexo({ nome: ficheiro.name, tipo: ficheiro.type, base64 })
    }
    leitor.readAsDataURL(ficheiro)
  }

  const enviarTexto = (evento) => {
    evento.preventDefault()
    enviar(textoEscrito)
    setTextoEscrito('')
  }

  return (
    <div className="flex h-[calc(100vh-160px)] flex-col">
      {/* ---------- Barra da conversa atual ---------- */}
      <div className="flex items-center justify-between pb-2">
        <p className="text-xs text-jarvis-texto/40">
          Conversa atual {voz.maosLivres && <span className="text-jarvis-ciano">· 🎙 mãos-livres ativo — diz «JARVIS»</span>}
        </p>
        <button
          onClick={comecarNovaConversa}
          disabled={mensagens.length === 0}
          title="A conversa atual fica guardada no Histórico"
          className="rounded-lg border border-jarvis-borda bg-jarvis-painel px-3 py-1.5 text-xs text-jarvis-texto/70 transition-colors hover:border-jarvis-ciano hover:text-jarvis-ciano disabled:opacity-40"
        >
          🆕 Nova conversa
        </button>
      </div>

      {/* ---------- Zona de mensagens ---------- */}
      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {mensagens.length === 0 && (
          <div className="pt-12 text-center">
            <p className="text-sm text-jarvis-texto/50">
              Toca no anel para falar, escreve em baixo, ou anexa uma imagem 📎
              <br />para o JARVIS analisar. (Wake word «JARVIS»: liga-a nas Definições.)
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
      <div className="flex items-center justify-center gap-6 py-3">
        {/* Botão central: anel estilo "reator" — clique para falar */}
        <button
          onClick={voz.aEscutar ? voz.pararEscuta : voz.comecarEscuta}
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

      {/* ---------- Anexo escolhido (à espera de ser enviado) ---------- */}
      {anexo && (
        <div className="flex items-center justify-center gap-2 pb-2">
          <span className="rounded-full bg-jarvis-ciano/10 px-3 py-1 text-xs text-jarvis-ciano">
            📎 {anexo.nome} — pronto a enviar com a próxima mensagem
          </span>
          <button
            onClick={() => setAnexo(null)}
            className="text-xs text-jarvis-texto/50 hover:text-red-400"
            title="Remover anexo"
          >
            ✕
          </button>
        </div>
      )}

      {/* ---------- Entrada por texto + anexos ---------- */}
      <form onSubmit={enviarTexto} className="flex gap-2">
        {/* Botão de anexar (abre o seletor de ficheiros escondido) */}
        <input
          ref={refFicheiro}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,.txt,text/plain"
          onChange={aoEscolherFicheiro}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => refFicheiro.current?.click()}
          title="Anexar imagem (o JARVIS analisa-a) ou ficheiro .txt"
          className="rounded-lg border border-jarvis-borda bg-jarvis-painel px-3 py-2 text-sm text-jarvis-texto/70 transition-colors hover:border-jarvis-ciano hover:text-jarvis-ciano"
        >
          📎
        </button>
        <input
          value={textoEscrito}
          onChange={(e) => setTextoEscrito(e.target.value)}
          placeholder={anexo ? 'Pergunta algo sobre a imagem…' : 'Ou escreve aqui a tua pergunta…'}
          className="flex-1 rounded-lg border border-jarvis-borda bg-jarvis-painel px-4 py-2 text-sm outline-none placeholder:text-jarvis-texto/40 focus:border-jarvis-ciano"
        />
        <button
          type="submit"
          disabled={aProcessar || (!textoEscrito.trim() && !anexo)}
          className="rounded-lg border border-jarvis-borda bg-jarvis-painel px-4 py-2 text-sm text-jarvis-ciano transition-colors hover:border-jarvis-ciano disabled:opacity-40"
        >
          Enviar
        </button>
      </form>
    </div>
  )
}
