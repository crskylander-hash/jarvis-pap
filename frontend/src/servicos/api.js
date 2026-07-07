// ============================================================
// PROJETO JARVIS — Comunicação com o backend FastAPI
// ============================================================
import { obterDeviceId, obterSessionId } from './dispositivo.js'
import { obterIdioma } from './vozTTS.js'

// URL do backend (definida no .env / variáveis da Vercel)
const URL_BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000'

/** Envia uma mensagem ao JARVIS e devolve a resposta do backend.
 *  Resposta: { resposta, display_mode, tokens_used, latency_ms } */
export async function enviarMensagem(mensagem) {
  const resposta = await fetch(`${URL_BACKEND}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      device_id: obterDeviceId(),
      session_id: obterSessionId(),
      mensagem,
      idioma: obterIdioma(), // o JARVIS responde no idioma escolhido na app
    }),
  })

  if (!resposta.ok) {
    // O backend devolve mensagens de erro em PT-PT no campo "detail"
    let detalhe = 'Ocorreu um erro ao contactar o JARVIS.'
    try {
      const corpo = await resposta.json()
      if (corpo.detail) detalhe = corpo.detail
    } catch { /* resposta sem JSON — mantém a mensagem por defeito */ }
    throw new Error(detalhe)
  }

  return resposta.json()
}

/** Verifica se o backend está online (indicador do dashboard). */
export async function verificarSaude() {
  try {
    const resposta = await fetch(`${URL_BACKEND}/health`, { signal: AbortSignal.timeout(5000) })
    return resposta.ok
  } catch {
    return false
  }
}
