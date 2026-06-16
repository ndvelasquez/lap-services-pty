// Infraestructura compartida: orquestación de automatizaciones (emails, PDFs, calendario).
// Antes apuntaba a webhooks de n8n; ahora invoca la Edge Function "lap-events" de Supabase,
// que enruta por `event` y ejecuta la lógica con la service-role key (ver
// supabase/functions/lap-events/index.ts). Mantener todo el código pasando por aquí.
import { supabase } from '../lib/supabase'

/**
 * Dispara una automatización en la Edge Function "lap-events".
 * @param {string} event  Nombre del evento (ej. 'new-appointment', 'gen-quotation-pdf-v5').
 * @param {object} data   Payload del evento (normalmente solo IDs; la función re-obtiene datos).
 */
export async function triggerWorkflow(event, data) {
  try {
    const { data: res, error } = await supabase.functions.invoke('lap-events', {
      body: { event, data },
    })
    if (error) {
      console.error(`lap-events error for ${event}:`, error)
      throw error
    }
    return res
  } catch (error) {
    console.error(`lap-events failed at ${event}:`, error)
    throw error
  }
}

// Alias temporal para minimizar el diff de migración desde n8n. Acepta el endpoint con o
// sin '/' inicial y lo normaliza al nombre de evento. Preferir triggerWorkflow en código nuevo.
export function triggerN8nWebhook(endpoint, data) {
  const event = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint
  return triggerWorkflow(event, data)
}
