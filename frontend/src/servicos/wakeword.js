// ============================================================
// PROJETO JARVIS — Deteção da wake word "JARVIS"
//
// O reconhecimento de voz em pt-PT erra frequentemente palavras
// estrangeiras como "Jarvis". Corrigimos em duas camadas:
//   1) Dicionário de substituições de erros comuns já observados
//   2) Distância de Levenshtein com tolerância de 2 caracteres
//      (apanha erros novos parecidos: "jarbes", "iarvis", ...)
// ============================================================

// Erros comuns do reconhecimento (todos contam como "jarvis")
const DICIONARIO_ERROS = [
  'jarvis', 'jarvi', 'jarve', 'jarves', 'jarbis', 'jarbas', 'javis',
  'davis', 'darvis', 'garvis', 'harvis', 'jervis', 'iarvis', 'xavis',
  'jarviz', 'jarvix', 'travis', 'chavis', 'jarrvis', 'jarvys',
]

/** Normaliza uma palavra: minúsculas e sem acentos. */
function normalizar(palavra) {
  return palavra
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove acentos (diacriticos combinados)
    .replace(/[^a-z]/g, '')          // remove pontuação/números
}

/** Distância de Levenshtein: número mínimo de edições (inserir,
 *  apagar, substituir) para transformar a palavra "a" na "b".
 *  Implementação clássica por programação dinâmica. */
export function levenshtein(a, b) {
  const m = a.length
  const n = b.length
  // matriz (m+1) x (n+1); linha 0 e coluna 0 são os casos base
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)])
  for (let j = 0; j <= n; j++) d[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1
      d[i][j] = Math.min(
        d[i - 1][j] + 1,        // apagar
        d[i][j - 1] + 1,        // inserir
        d[i - 1][j - 1] + custo // substituir
      )
    }
  }
  return d[m][n]
}

/** Verifica se UMA palavra é a wake word (dicionário + Levenshtein ≤ 2). */
export function ePalavraWake(palavra) {
  const p = normalizar(palavra)
  if (p.length < 4) return false // palavras muito curtas geram falsos positivos
  if (DICIONARIO_ERROS.includes(p)) return true
  return levenshtein(p, 'jarvis') <= 2
}

/** Procura a wake word numa transcrição completa.
 *  Devolve { detetada, comando } — "comando" é o texto que vem DEPOIS
 *  da wake word (ex.: "jarvis que horas são" → comando "que horas são"). */
export function detetarWakeWord(transcricao) {
  const palavras = transcricao.trim().split(/\s+/)
  for (let i = 0; i < palavras.length; i++) {
    if (ePalavraWake(palavras[i])) {
      return { detetada: true, comando: palavras.slice(i + 1).join(' ').trim() }
    }
  }
  return { detetada: false, comando: '' }
}
