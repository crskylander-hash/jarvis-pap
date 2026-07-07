// ============================================================
// PROJETO JARVIS — Reconhecimento de voz (STT) via Web Speech API
//
// Hook React "useReconhecimentoVoz" com dois modos:
//   • clique-para-falar: ouve UMA frase e envia-a
//   • mãos-livres: escuta contínua; só reage quando ouve "JARVIS"
//     (com correção de erros — ver wakeword.js)
// ============================================================
import { useCallback, useEffect, useRef, useState } from 'react'
import { detetarWakeWord } from './wakeword.js'
import { obterIdioma } from './vozTTS.js'

// O Chrome usa o prefixo "webkit"; o Firefox ainda não suporta esta API
const Reconhecimento =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null

export const suportaReconhecimento = Boolean(Reconhecimento)

/**
 * Hook de reconhecimento de voz.
 * aoTerComando(texto) — chamado quando há um comando pronto a enviar.
 * Devolve estado e controlos para a interface.
 */
export function useReconhecimentoVoz(aoTerComando) {
  const [aEscutar, setAEscutar] = useState(false)          // microfone ativo?
  const [maosLivres, setMaosLivres] = useState(false)      // modo wake word?
  const [transcricao, setTranscricao] = useState('')       // texto interino (feedback visual)
  const [wakeDetetada, setWakeDetetada] = useState(false)  // "JARVIS" ouvido, à espera do comando

  const refReconhecedor = useRef(null)
  const refMaosLivres = useRef(false)   // cópias em ref para usar dentro dos callbacks
  const refWake = useRef(false)
  const refCallback = useRef(aoTerComando)
  refCallback.current = aoTerComando

  /** Processa um resultado FINAL do reconhecedor. */
  const processarFinal = useCallback((texto) => {
    const limpo = texto.trim()
    if (!limpo) return

    if (!refMaosLivres.current) {
      // Modo clique-para-falar: qualquer frase final é o comando
      refCallback.current(limpo)
      return
    }

    // Modo mãos-livres: só reagimos com a wake word
    if (refWake.current) {
      // Já tínhamos ouvido "JARVIS" — esta frase é o comando
      refWake.current = false
      setWakeDetetada(false)
      refCallback.current(limpo)
      return
    }

    const { detetada, comando } = detetarWakeWord(limpo)
    if (detetada && comando) {
      // "jarvis que horas são" — wake word e comando na mesma frase
      refCallback.current(comando)
    } else if (detetada) {
      // Só "jarvis" — fica à espera da próxima frase
      refWake.current = true
      setWakeDetetada(true)
    }
    // Sem wake word: ignora (privacidade — nada é enviado)
  }, [])

  /** Cria e configura um reconhecedor novo. */
  const criarReconhecedor = useCallback(() => {
    const rec = new Reconhecimento()
    rec.lang = obterIdioma()       // reconhecimento no idioma escolhido pelo utilizador
    rec.continuous = true          // não parar à primeira pausa
    rec.interimResults = true      // resultados provisórios (feedback visual)

    rec.onresult = (evento) => {
      let interino = ''
      for (let i = evento.resultIndex; i < evento.results.length; i++) {
        const resultado = evento.results[i]
        if (resultado.isFinal) {
          processarFinal(resultado[0].transcript)
          interino = ''
        } else {
          interino += resultado[0].transcript
        }
      }
      setTranscricao(interino)
    }

    rec.onend = () => {
      // O browser pára sozinho após silêncio; em mãos-livres, religamos
      if (refMaosLivres.current && refReconhecedor.current === rec) {
        try { rec.start() } catch { /* já estava a arrancar */ }
      } else if (refReconhecedor.current === rec) {
        setAEscutar(false)
        setTranscricao('')
      }
    }

    rec.onerror = (evento) => {
      // "no-speech" e "aborted" são normais; outros erros desligam a escuta
      if (evento.error !== 'no-speech' && evento.error !== 'aborted') {
        console.warn('Erro de reconhecimento:', evento.error)
        refMaosLivres.current = false
        setMaosLivres(false)
        setAEscutar(false)
      }
    }
    return rec
  }, [processarFinal])

  /** Liga o microfone (modo simples, uma frase). */
  const comecarEscuta = useCallback(() => {
    if (!Reconhecimento || refReconhecedor.current) return
    const rec = criarReconhecedor()
    refReconhecedor.current = rec
    rec.start()
    setAEscutar(true)
  }, [criarReconhecedor])

  /** Desliga o microfone por completo. */
  const pararEscuta = useCallback(() => {
    refMaosLivres.current = false
    setMaosLivres(false)
    refWake.current = false
    setWakeDetetada(false)
    const rec = refReconhecedor.current
    refReconhecedor.current = null
    if (rec) rec.stop()
    setAEscutar(false)
    setTranscricao('')
  }, [])

  /** Ativa/desativa o modo mãos-livres (escuta contínua com wake word). */
  const alternarMaosLivres = useCallback(() => {
    if (refMaosLivres.current) {
      pararEscuta()
    } else {
      refMaosLivres.current = true
      setMaosLivres(true)
      if (!refReconhecedor.current) {
        const rec = criarReconhecedor()
        refReconhecedor.current = rec
        rec.start()
        setAEscutar(true)
      }
    }
  }, [criarReconhecedor, pararEscuta])

  // Limpeza ao desmontar o componente (evita microfones "pendurados")
  useEffect(() => () => {
    refMaosLivres.current = false
    if (refReconhecedor.current) refReconhecedor.current.stop()
  }, [])

  return {
    aEscutar, maosLivres, transcricao, wakeDetetada,
    comecarEscuta, pararEscuta, alternarMaosLivres,
  }
}
