// ============================================================
// PROJETO JARVIS — Ponto de entrada da PWA
// Monta a aplicação React e regista o service worker (PWA)
// ============================================================
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './estilos.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)

// Regista o service worker — é isto que torna a app instalável (PWA)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((erro) => {
      console.warn('Service worker não registado:', erro)
    })
  })
}
