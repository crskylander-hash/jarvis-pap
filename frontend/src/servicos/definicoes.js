// ============================================================
// PROJETO JARVIS — Definições gerais da aplicação
// (as definições de voz/idioma vivem em vozTTS.js; aqui ficam
// as restantes preferências, guardadas em localStorage)
// ============================================================

const CHAVE_MAOS_LIVRES = 'jarvis_maos_livres'

/** True se o modo mãos-livres (escuta contínua com a wake word
 *  «JARVIS») deve ligar-se automaticamente ao abrir a conversa. */
export function maosLivresAtivo() {
  return localStorage.getItem(CHAVE_MAOS_LIVRES) === '1'
}

/** Liga/desliga o modo mãos-livres nas definições. */
export function definirMaosLivres(ativo) {
  localStorage.setItem(CHAVE_MAOS_LIVRES, ativo ? '1' : '0')
}
