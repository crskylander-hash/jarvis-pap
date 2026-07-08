// ============================================================
// PROJETO JARVIS — Componente principal e navegação
// Rotas: / (conversa por voz) · /leitura (respostas enviadas
// para a app) · /dashboard (métricas em tempo real)
// ============================================================
import { NavLink, Route, Routes } from 'react-router-dom'
import Conversa from './paginas/Conversa.jsx'
import Historico from './paginas/Historico.jsx'
import Leitura from './paginas/Leitura.jsx'
import Dashboard from './paginas/Dashboard.jsx'
import Definicoes from './paginas/Definicoes.jsx'
import Sobre from './paginas/Sobre.jsx'

// Estilo dos separadores de navegação (ativo = ciano)
function classeSeparador({ isActive }) {
  return [
    'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
    isActive
      ? 'bg-jarvis-painel text-jarvis-ciano border border-jarvis-borda'
      : 'text-jarvis-texto/60 hover:text-jarvis-ciano',
  ].join(' ')
}

export default function App() {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4">
      {/* Cabeçalho com o nome do assistente e a navegação */}
      <header className="flex items-center justify-between py-5">
        <h1 className="text-2xl font-bold tracking-[0.3em] text-jarvis-ciano">
          J.A.R.V.I.S
        </h1>
        <nav className="flex flex-wrap justify-end gap-1">
          <NavLink to="/" end className={classeSeparador}>Conversa</NavLink>
          <NavLink to="/historico" className={classeSeparador}>Histórico</NavLink>
          <NavLink to="/leitura" className={classeSeparador}>Leitura</NavLink>
          <NavLink to="/dashboard" className={classeSeparador}>Dashboard</NavLink>
          <NavLink to="/definicoes" className={classeSeparador}>Definições</NavLink>
          <NavLink to="/sobre" className={classeSeparador}>Sobre</NavLink>
        </nav>
      </header>

      {/* Conteúdo da rota ativa */}
      <main className="flex-1 pb-8">
        <Routes>
          <Route path="/" element={<Conversa />} />
          <Route path="/historico" element={<Historico />} />
          <Route path="/leitura" element={<Leitura />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/definicoes" element={<Definicoes />} />
          <Route path="/sobre" element={<Sobre />} />
        </Routes>
      </main>

      <footer className="pb-4 text-center text-xs text-jarvis-texto/40">
        PAP · Carlos Rafael Resendes Silva · 2026
      </footer>
    </div>
  )
}
