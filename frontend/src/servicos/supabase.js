// ============================================================
// PROJETO JARVIS — Cliente Supabase (leituras + tempo real)
//
// • Leituras: via API REST com a chave pública (anon). O cabeçalho
//   "x-device-id" identifica o dispositivo e o RLS na base de dados
//   garante que só recebemos as NOSSAS linhas.
// • Tempo real: subscrevemos o canal "device-<uuid>" por WebSocket;
//   o backend envia lá eventos (broadcast) quando há novidades.
// ============================================================
import { createClient } from '@supabase/supabase-js'
import { obterDeviceId } from './dispositivo.js'

const URL_SUPABASE = import.meta.env.VITE_SUPABASE_URL || ''
const CHAVE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// O cabeçalho x-device-id vai em TODOS os pedidos REST — é ele que o RLS usa
export const supabase = createClient(URL_SUPABASE, CHAVE_ANON, {
  global: { headers: { 'x-device-id': obterDeviceId() } },
})

/** Vai buscar o histórico de conversas deste dispositivo (RLS filtra por nós). */
export async function obterHistorico(limite = 50) {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .order('timestamp', { ascending: true })
    .limit(limite)
  if (error) throw error
  return data
}

/** Vai buscar apenas as respostas enviadas para a app (vista de leitura). */
export async function obterRespostasParaApp() {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('display_mode', 'app')
    .order('timestamp', { ascending: false })
  if (error) throw error
  return data
}

/** Subscreve o canal em tempo real deste dispositivo.
 *  aoEvento(nomeEvento, payload) é chamado a cada novidade.
 *  Devolve uma função para cancelar a subscrição. */
export function subscreverTempoReal(aoEvento) {
  const canal = supabase
    .channel(`device-${obterDeviceId()}`)
    .on('broadcast', { event: '*' }, (mensagem) => {
      aoEvento(mensagem.event, mensagem.payload)
    })
    .subscribe()

  return () => supabase.removeChannel(canal)
}
