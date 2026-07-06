// Configuração do Tailwind — tema escuro "JARVIS" (azul/ciano sobre escuro)
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta do projeto: fundo quase-preto azulado + ciano de destaque
        jarvis: {
          fundo: '#0a0f1e',      // fundo principal
          painel: '#101830',     // cartões/painéis
          borda: '#1e2a4a',      // contornos subtis
          ciano: '#22d3ee',      // cor de destaque (anéis, botões, texto ativo)
          texto: '#c7d2e0',      // texto normal
        },
      },
      // Animação de "respiração" do anel enquanto o JARVIS escuta
      keyframes: {
        pulso: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(34, 211, 238, 0.45)' },
          '50%': { boxShadow: '0 0 0 24px rgba(34, 211, 238, 0)' },
        },
      },
      animation: {
        pulso: 'pulso 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
