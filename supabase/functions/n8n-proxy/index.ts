import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Dominio(s) permitidos para CORS. Configurar ALLOWED_ORIGIN en los secrets de la
// edge function (Supabase → Functions → Secrets). Fallback al sitio de producción.
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || 'https://lapservicepty.com'
// Secreto compartido para autenticar las llamadas del frontend al proxy.
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET') || ''

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Validar secreto compartido antes de proxear nada.
  if (WEBHOOK_SECRET && req.headers.get('x-webhook-secret') !== WEBHOOK_SECRET) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 },
    )
  }

  try {
    const body = await req.json()
    const { endpoint, method = 'POST' } = body
    
    if (!endpoint) {
      throw new Error("Missing 'endpoint' in request body");
    }

    // Extract payload: check 'params' (from api.js) first, then 'payload', then root
    let payload = body.params || body.payload || { ...body };
    
    // Flatten if it was from root
    if (payload === body) {
      payload = { ...body };
      delete payload.endpoint;
      delete payload.method;
    }

    // Base URL for n8n
    const N8N_BASE_URL = "https://n8n.srv1444974.hstgr.cloud/webhook"
    
    // Ensure endpoint starts with a slash
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
    let targetUrl = `${N8N_BASE_URL}${cleanEndpoint}`

    const fetchOptions: RequestInit = {
      method: method.toUpperCase(),
      headers: {
        'Content-Type': 'application/json',
      },
    }

    if (fetchOptions.method === 'GET') {
      const queryParams = new URLSearchParams();
      for (const [key, value] of Object.entries(payload)) {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      }
      const queryString = queryParams.toString();
      if (queryString) {
        targetUrl += `?${queryString}`
      }
    } else {
      fetchOptions.body = JSON.stringify(payload)
    }

    console.log(`Forwarding ${fetchOptions.method} request to: ${targetUrl}`);

    const response = await fetch(targetUrl, fetchOptions)
    
    // Handle response content
    const contentType = response.headers.get('content-type')
    let responseData;
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json()
    } else {
      const text = await response.text();
      try {
        responseData = JSON.parse(text);
      } catch {
        responseData = { message: text };
      }
    }

    return new Response(
      JSON.stringify(responseData),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: response.status 
      },
    )
  } catch (error) {
    console.error("n8n-proxy Error:", error);
    return new Response(
      JSON.stringify({ error: 'Bad request' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      },
    )
  }
})
