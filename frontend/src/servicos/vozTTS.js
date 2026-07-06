// ============================================================
// PROJETO JARVIS — Síntese de voz (TTS) via Speech Synthesis API
// Voz portuguesa, velocidade configurável (0,8×–1,5×) e
// interrompível a qualquer momento.
// ============================================================

const CHAVE_VELOCIDADE = 'jarvis_tts_velocidade'

/** Lê a velocidade guardada (por defeito 1.0×). */
export function obterVelocidade() {
  const v = parseFloat(localStorage.getItem(CHAVE_VELOCIDADE))
  return Number.isFinite(v) ? Math.min(1.5, Math.max(0.8, v)) : 1.0
}

/** Guarda a velocidade escolhida pelo utilizador. */
export function definirVelocidade(v) {
  localStorage.setItem(CHAVE_VELOCIDADE, String(v))
}

/** Escolhe a melhor voz portuguesa disponível no dispositivo
 *  (preferência: pt-PT; caso não exista, qualquer voz "pt"). */
function escolherVozPortuguesa() {
  const vozes = window.speechSynthesis.getVoices()
  return (
    vozes.find((v) => v.lang === 'pt-PT') ||
    vozes.find((v) => v.lang.startsWith('pt')) ||
    null
  )
}

/** Fala um texto. aoTerminar() é chamado quando acabar (ou for interrompido). */
export function falar(texto, aoTerminar) {
  parar() // interrompe qualquer fala anterior

  const fala = new SpeechSynthesisUtterance(texto)
  fala.lang = 'pt-PT'
  fala.rate = obterVelocidade()
  const voz = escolherVozPortuguesa()
  if (voz) fala.voice = voz

  if (aoTerminar) {
    fala.onend = aoTerminar
    fala.onerror = aoTerminar
  }
  window.speechSynthesis.speak(fala)
}

/** Interrompe imediatamente a fala em curso. */
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
