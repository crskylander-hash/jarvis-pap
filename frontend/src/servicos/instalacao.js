// ============================================================
// PROJETO JARVIS — Instalação da PWA com um botão
//
// O browser dispara o evento "beforeinstallprompt" quando a app
// é instalável. Guardamos esse evento e usamo-lo quando o
// utilizador clica em «Instalar» — a janela nativa de instalação
// abre na hora. (No iPhone/Safari este evento não existe: aí
// mostramos as instruções manuais.)
// ============================================================

let eventoInstalacao = null

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (evento) => {
    evento.preventDefault()      // guarda para usarmos no nosso botão
    eventoInstalacao = evento
  })
  window.addEventListener('appinstalled', () => {
    eventoInstalacao = null      // já está instalada
  })
}

/** True se o browser permite instalar já com um clique. */
export function podeInstalarDireto() {
  return eventoInstalacao !== null
}

/** Abre a janela nativa de instalação. Devolve true se o utilizador aceitou. */
export async function instalarApp() {
  if (!eventoInstalacao) return false
  eventoInstalacao.prompt()
  const resultado = await eventoInstalacao.userChoice
  if (resultado.outcome === 'accepted') eventoInstalacao = null
  return resultado.outcome === 'accepted'
}
