// ============================================================
// PROJETO JARVIS — Identidade anónima do dispositivo
//
// Sem contas de utilizador: na primeira visita geramos um UUID
// (device_id) e guardamo-lo no localStorage. Todas as conversas
// ficam associadas a este identificador, e o RLS no Supabase
// garante que cada dispositivo só lê as suas próprias linhas.
// ============================================================

const CHAVE_DEVICE = 'jarvis_device_id'
const CHAVE_SESSAO = 'jarvis_session_id'

/** Devolve o device_id deste dispositivo, criando-o na primeira visita. */
export function obterDeviceId() {
  let id = localStorage.getItem(CHAVE_DEVICE)
  if (!id) {
    id = crypto.randomUUID() // UUID v4 gerado pelo próprio browser
    localStorage.setItem(CHAVE_DEVICE, id)
  }
  return id
}

/** Devolve o session_id desta sessão de utilização (novo a cada visita/abertura).
 *  Usamos sessionStorage: morre quando o separador fecha — é isso que define "sessão". */
export function obterSessionId() {
  let id = sessionStorage.getItem(CHAVE_SESSAO)
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem(CHAVE_SESSAO, id)
  }
  return id
}

/** Começa uma conversa nova: gera um session_id novo.
 *  A conversa anterior fica guardada e passa a ver-se no Histórico. */
export function novaSessao() {
  const id = crypto.randomUUID()
  sessionStorage.setItem(CHAVE_SESSAO, id)
  return id
}
