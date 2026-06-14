// Infraestructura compartida: integración con webhooks de n8n.
// Usada por varios dominios (auth, appointments, quotations, payments) para
// disparar correos, generación de PDFs y sync de calendario de forma asíncrona.

export async function triggerN8nWebhook(endpoint, data, method = 'POST') {
  try {
    // Llamada directa al webhook de n8n (sin proxy Edge Function) para evitar
    // el problema de body anidado del proxy.
    const n8nHost = import.meta.env.VITE_N8N_HOST || 'https://n8n.srv1444974.hstgr.cloud'
    const webhookUrl = `${n8nHost}/webhook${endpoint}`

    const response = await fetch(webhookUrl, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })

    const result = await response.json()

    if (!response.ok) {
      console.error(`n8n webhook error for ${endpoint}:`, result)
      throw new Error(`Error en n8n: ${result.message || response.statusText}`)
    }

    return result
  } catch (error) {
    console.error(`n8n webhook failed at ${endpoint}:`, error)
    throw error
  }
}
