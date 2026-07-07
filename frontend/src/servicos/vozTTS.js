// ============================================================
// PROJETO JARVIS — Síntese de voz (TTS) via Speech Synthesis API
//
// • Voz portuguesa à escolha do utilizador (guardada em localStorage)
// • Velocidade configurável (0,8×–1,5×)
// • Interrompível a qualquer momento
// • As falas longas são divididas em frases e ditas em fila:
//   o Chrome aborta falas com mais de ~15 s, e assim cada pedaço
//   fica curto e a resposta é dita ATÉ AO FIM.
// ============================================================

const CHAVE_VELOCIDADE = 'jarvis_tts_velocidade'
const CHAVE_VOZ = 'jarvis_tts_voz'

// ------------------------------------------------------------
// Velocidade
// ------------------------------------------------------------
/** Lê a velocidade guardada (por defeito 1.0×). */
export function obterVelocidade() {
  const v = parseFloat(localStorage.getItem(CHAVE_VELOCIDADE))
  return Number.isFinite(v) ? Math.min(1.5, Math.max(0.8, v)) : 1.0
}

/** Guarda a velocidade escolhida pelo utilizador. */
export function definirVelocidade(v) {
  localStorage.setItem(CHAVE_VELOCIDADE, String(v))
}

// ------------------------------------------------------------
// Escolha da voz
// ------------------------------------------------------------
/** Lista todas as vozes portuguesas disponíveis neste dispositivo. */
export function listarVozesPortuguesas() {
  return window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang.toLowerCase().startsWith('pt'))
}

/** Nome da voz escolhida pelo utilizador (vazio = automática). */
export function obterNomeVozEscolhida() {
  return localStorage.getItem(CHAVE_VOZ) || ''
}

/** Guarda a voz escolhida pelo utilizador. */
export function definirVozEscolhida(nome) {
  localStorage.setItem(CHAVE_VOZ, nome)
}

/** Devolve a voz a usar: a escolhida pelo utilizador ou, na falta dela,
 *  a melhor voz portuguesa disponível (preferência pt-PT). */
function escolherVozPortuguesa() {
  const vozes = window.speechSynthesis.getVoices()
  const nomeGuardado = obterNomeVozEscolhida()
  if (nomeGuardado) {
    const escolhida = vozes.find((v) => v.name === nomeGuardado)
    if (escolhida) return escolhida
  }
  return (
    vozes.find((v) => v.lang === 'pt-PT') ||
    vozes.find((v) => v.lang.toLowerCase().startsWith('pt')) ||
    null
  )
}

// ------------------------------------------------------------
// Divisão do texto em frases curtas (correção do corte do Chrome)
// ------------------------------------------------------------
const TAMANHO_MAXIMO_PEDACO = 180 // carateres por pedaço de fala

/** Divide um texto em pedaços curtos, cortando nos fins de frase
 *  (e, em frases muito longas, nas vírgulas). */
function dividirEmPedacos(texto) {
  // Separa por fim de frase, mantendo a pontuação
  const frases = texto.split(/(?<=[.!?…])\s+/)
  const pedacos = []
  let atual = ''

  for (const frase of frases) {
    if ((atual + ' ' + frase).trim().length <= TAMANHO_MAXIMO_PEDACO) {
      atual = (atual + ' ' + frase).trim()
      continue
    }
    if (atual) pedacos.push(atual)
    if (frase.length <= TAMANHO_MAXIMO_PEDACO) {
      atual = frase
    } else {
      // Frase gigante sem pontos: corta nas vírgulas/espacos
      let resto = frase
      while (resto.length > TAMANHO_MAXIMO_PEDACO) {
        let corte = resto.lastIndexOf(',', TAMANHO_MAXIMO_PEDACO)
        if (corte < 40) corte = resto.lastIndexOf(' ', TAMANHO_MAXIMO_PEDACO)
        if (corte < 40) corte = TAMANHO_MAXIMO_PEDACO
        pedacos.push(resto.slice(0, corte + 1).trim())
        resto = resto.slice(corte + 1).trim()
      }
      atual = resto
    }
  }
  if (atual) pedacos.push(atual)
  return pedacos.filter(Boolean)
}

// ------------------------------------------------------------
// Falar / parar
// ------------------------------------------------------------
/** Fala um texto (dividido em frases, ditas em fila até ao fim).
 *  aoTerminar() é chamado quando acabar tudo (ou for interrompido). */
export function falar(texto, aoTerminar) {
  parar() // interrompe qualquer fala anterior

  const voz = escolherVozPortuguesa()
  const pedacos = dividirEmPedacos(texto)

  pedacos.forEach((pedaco, indice) => {
    const fala = new SpeechSynthesisUtterance(pedaco)
    fala.lang = 'pt-PT'
    fala.rate = obterVelocidade()
    if (voz) fala.voice = voz

    // Só o ÚLTIMO pedaço avisa que a fala terminou
    if (indice === pedacos.length - 1 && aoTerminar) {
      fala.onend = aoTerminar
      fala.onerror = aoTerminar
    }
    // O speechSynthesis põe as falas em fila automaticamente
    window.speechSynthesis.speak(fala)
  })
}

/** Interrompe imediatamente a fala em curso (limpa a fila toda). */
export function parar() {
  window.speechSynthesis.cancel()
}

/** True enquanto o JARVIS está a falar. */
export function estaAFalar() {
  return window.speechSynthesis.speaking
}

// Nota: em alguns browsers as vozes só ficam disponíveis depois do
// evento "voiceschanged" — este listener força o carregamento cedo.
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {}
}
