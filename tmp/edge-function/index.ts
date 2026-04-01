import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
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
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      },
    )
  }
})
