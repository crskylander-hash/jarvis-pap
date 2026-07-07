// ============================================================
// PROJETO JARVIS — Página "Sobre"
// Explica o projeto, a arquitetura e as tecnologias — pensada
// para o júri (e qualquer utilizador) explorar dentro da app.
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
      <h2 className="text-lg font-semibold text-jarvis-ciano">Sobre o projeto</h2>

      <Seccao titulo="O que é o JARVIS">
        <p>
          Assistente pessoal de voz inspirado no JARVIS do Iron Man, com dois
          «rostos» ligados ao mesmo cérebro na cloud: esta aplicação (PWA) e um
          protótipo físico de óculos com Raspberry Pi Zero 2W.
        </p>
        <p>
          Prova de Aptidão Profissional de <strong>Carlos Rafael Resendes Silva</strong>,
          Curso Profissional de Programador de Informática — Agrupamento de
          Escolas Rafael Bordalo Pinheiro, Caldas da Rainha, 2026.
        </p>
      </Seccao>

      <Seccao titulo="Como funciona">
        <ol className="list-decimal space-y-1 pl-5">
          <li>A tua voz é reconhecida no próprio dispositivo (Web Speech API, pt-PT)</li>
          <li>A pergunta segue para o backend (FastAPI, alojado no PythonAnywhere)</li>
          <li>O backend junta a memória da conversa (últimos 10 turnos deste dispositivo)
              e consulta o modelo de IA (Claude, da Anthropic)</li>
          <li>A resposta volta, é falada em voz alta e fica guardada na base de dados
              (Supabase/PostgreSQL)</li>
          <li>O dashboard atualiza-se sozinho em tempo real (WebSocket)</li>
        </ol>
      </Seccao>

      <Seccao titulo="Privacidade por desenho">
        <p>
          Sem contas, sem emails, sem dados pessoais: cada dispositivo recebe um
          identificador anónimo gerado localmente. Na base de dados, o
          <em> Row Level Security</em> garante que cada dispositivo só consegue ler
          as suas próprias conversas — imposto pelo próprio PostgreSQL, não apenas
          pelo código.
        </p>
      </Seccao>

      <Seccao titulo="Tecnologias">
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Frontend:</strong> React 18 + Tailwind CSS, PWA instalável (Vercel)</li>
          <li><strong>Backend:</strong> Python 3.12 + FastAPI (PythonAnywhere, ASGI)</li>
          <li><strong>Base de dados:</strong> Supabase — PostgreSQL com RLS + Realtime</li>
          <li><strong>IA:</strong> Claude Haiku 4.5, via API da Anthropic</li>
          <li><strong>Voz:</strong> Web Speech API (reconhecimento) + Speech Synthesis (fala)</li>
          <li><strong>Óculos:</strong> Raspberry Pi Zero 2W, Vosk (voz offline) e espeak-ng</li>
        </ul>
      </Seccao>

      <Seccao titulo="Comandos especiais">
        <p>
          🎙 Diz <strong>«JARVIS»</strong> no modo mãos-livres para acordar o assistente
          (tolera erros de pronúncia — distância de Levenshtein ≤ 2).
        </p>
        <p>
          📱 Diz <strong>«envia para a app»</strong> depois de uma resposta longa: por voz
          ouves só um resumo, e o texto completo aparece na aba <em>Leitura</em>.
        </p>
      </Seccao>

      <p className="pb-2 text-center text-xs text-jarvis-texto/40">
        Código aberto e comentado em PT-PT · github.com/crskylander-hash/jarvis-pap
      </p>
    </div>
  )
}
