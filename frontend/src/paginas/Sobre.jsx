// ============================================================
// PROJETO JARVIS — Página "Sobre"
// Informação sobre o autor, a escola e a razão de ser do projeto,
// mais a instalação da app e a transferência do código (open source).
// ============================================================
import { useState } from 'react'
import { instalarApp, podeInstalarDireto } from '../servicos/instalacao.js'

// Ligação direta para descarregar TODO o código do projeto (.zip)
const LIGACAO_CODIGO_ZIP =
  'https://github.com/crskylander-hash/jarvis-pap/archive/refs/heads/main.zip'
const LIGACAO_GITHUB = 'https://github.com/crskylander-hash/jarvis-pap'

/** Secção com título ciano e conteúdo. */
function Seccao({ titulo, children }) {
  return (
    <section className="rounded-2xl border border-jarvis-borda bg-jarvis-painel p-5">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-jarvis-ciano">
        {titulo}
      </h3>
      <div className="space-y-2 text-sm leading-relaxed text-jarvis-texto/90">{children}</div>
    </section>
  )
}

export default function Sobre() {
  const [estadoInstalacao, setEstadoInstalacao] = useState('')

  const aoInstalar = async () => {
    if (podeInstalarDireto()) {
      const aceitou = await instalarApp()
      setEstadoInstalacao(aceitou ? 'App instalada! Procura o ícone do JARVIS no teu dispositivo 🎉' : '')
    } else {
      // Sem o evento (já instalada, ou iPhone/Safari): instruções manuais
      setEstadoInstalacao(
        'Se a app já não estiver instalada: no PC usa o ícone de instalação na barra de endereço; ' +
        'no Android: menu ⋮ → «Adicionar ao ecrã principal»; no iPhone: Partilhar → «Adicionar ao ecrã principal».'
      )
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-jarvis-ciano">Sobre</h2>

      {/* ---------- Instalar e descarregar (open source) ---------- */}
      <Seccao titulo="Instalar e descarregar">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={aoInstalar}
            className="rounded-lg border border-jarvis-ciano bg-jarvis-ciano/10 px-4 py-2 text-sm font-medium text-jarvis-ciano transition-colors hover:bg-jarvis-ciano/20"
          >
            ⬇ Instalar a app (PC/telemóvel)
          </button>
          <a
            href={LIGACAO_CODIGO_ZIP}
            className="rounded-lg border border-jarvis-borda bg-jarvis-fundo px-4 py-2 text-sm text-jarvis-texto/80 transition-colors hover:border-jarvis-ciano hover:text-jarvis-ciano"
          >
            📦 Descarregar o código (.zip)
          </a>
          <a
            href={LIGACAO_GITHUB}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-jarvis-borda bg-jarvis-fundo px-4 py-2 text-sm text-jarvis-texto/80 transition-colors hover:border-jarvis-ciano hover:text-jarvis-ciano"
          >
            🐙 Ver no GitHub
          </a>
        </div>
        {estadoInstalacao && (
          <p className="mt-3 text-xs leading-relaxed text-jarvis-ciano/80">{estadoInstalacao}</p>
        )}
        <p className="mt-3 text-xs text-jarvis-texto/50">
          O JARVIS é software livre (licença MIT): podes descarregar, estudar,
          alterar e usar o código — no PC ou no telemóvel — gratuitamente.
        </p>
      </Seccao>

      <Seccao titulo="O que é o JARVIS">
        <p>
          O JARVIS é um assistente pessoal de voz com inteligência artificial:
          fala com ele em linguagem natural, por voz ou por texto, e ele responde,
          lembra-se do contexto da conversa, analisa imagens e guarda o teu
          histórico em privado — sem contas, sem emails, sem dados pessoais.
        </p>
        <p>
          O nome é uma homenagem ao assistente do Tony Stark (Iron Man): a ideia
          de um assistente sempre disponível, útil e com personalidade — mas
          construído por um estudante, com ferramentas acessíveis a qualquer pessoa.
        </p>
      </Seccao>

      <Seccao titulo="Porque existe">
        <p>
          Este projeto nasceu de uma pergunta: <em>será possível construir o núcleo
          inteligente dos assistentes vestíveis modernos — como os óculos com IA —
          com o orçamento e os conhecimentos de um estudante?</em> O JARVIS é a
          resposta, desenvolvido como Prova de Aptidão Profissional (PAP): um
          produto completo, publicado na Internet e utilizável por qualquer pessoa.
        </p>
      </Seccao>

      <Seccao titulo="O autor">
        <p><strong className="text-jarvis-ciano">Carlos Rafael Resendes Silva</strong></p>
        <p>
          Aluno finalista do Curso Profissional de Programador de Informática
          (ciclo de formação 2023–2026), com especial interesse em inteligência
          artificial e desenvolvimento de produto.
        </p>
        <p className="text-jarvis-texto/60">Orientação: Prof. Rui Tempero</p>
      </Seccao>

      <Seccao titulo="A escola">
        <p>
          <strong>Agrupamento de Escolas Rafael Bordalo Pinheiro</strong>
          <br />Caldas da Rainha, Portugal
        </p>
        <p>
          Projeto desenvolvido e defendido no âmbito da Prova de Aptidão
          Profissional, 2026.
        </p>
      </Seccao>

      <p className="pb-2 text-center text-xs text-jarvis-texto/40">
        Código aberto e comentado em português · github.com/crskylander-hash/jarvis-pap
      </p>
    </div>
  )
}
