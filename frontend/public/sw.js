// ============================================================
// PROJETO JARVIS — Service Worker (torna a app instalável / PWA)
// Estratégia: "network first" com cache de recurso — se a rede
// falhar, serve a última versão guardada em cache (a interface
// abre mesmo offline; as respostas do JARVIS precisam de rede).
// ============================================================
const NOME_CACHE = 'jarvis-cache-v1'

// Ficheiros essenciais guardados logo na instalação
const FICHEIROS_BASE = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png']

// Instalação: guarda os ficheiros base em cache
self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(NOME_CACHE).then((cache) => cache.addAll(FICHEIROS_BASE))
  )
  self.skipWaiting()
})

// Ativação: apaga caches de versões antigas
self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys().then((nomes) =>
      Promise.all(nomes.filter((n) => n !== NOME_CACHE).map((n) => caches.delete(n)))
    )
  )
  self.clients.claim()
})

// Pedidos: tenta a rede primeiro; se falhar, usa a cache
self.addEventListener('fetch', (evento) => {
  const pedido = evento.request
  // Só tratamos GETs do próprio site (a API e o Supabase nunca são cacheados)
  if (pedido.method !== 'GET' || new URL(pedido.url).origin !== self.location.origin) return

  evento.respondWith(
    fetch(pedido)
      .then((resposta) => {
        // Guarda uma cópia em cache para uso offline
        const copia = resposta.clone()
        caches.open(NOME_CACHE).then((cache) => cache.put(pedido, copia))
        return resposta
      })
      .catch(() => caches.match(pedido).then((r) => r || caches.match('/')))
  )
})
