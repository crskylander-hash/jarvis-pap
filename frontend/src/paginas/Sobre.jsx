// ============================================================
// PROJETO JARVIS — Página "Sobre"
// Informação sobre o autor, a escola e a razão de ser do projeto.
// ============================================================

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
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-jarvis-ciano">Sobre</h2>

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
