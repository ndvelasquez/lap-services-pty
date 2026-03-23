---
name: lap-quotation-pipeline
description: Build the n8n webhook workflow for LAP Services PTY quotation delivery. Use when creating the /send-quotation webhook, generating PDF quotations, and emailing them to clients.
---

# LAP Services — Quotation Pipeline Workflow

This skill documents how to build the n8n workflow that generates and sends quotations (cotizaciones) to LAP Services PTY clients.

---

## Trigger Context

The frontend (`src/services/api.js`) calls this webhook when an admin clicks "Enviar al Cliente" in the Quotation Builder:

```
POST {N8N_BASE_URL}/send-quotation
Content-Type: application/json
```

### Incoming Payload
```json
{
  "quoteId": "uuid-of-quotation"
}
```

> **Note:** The frontend already updates the quotation status to `sent` in Supabase before calling this webhook. This workflow only needs to generate the PDF and email it.

---

## Workflow Pattern

```
Webhook (POST /send-quotation)
  → Supabase: Fetch Quotation (quotations + quotation_items)
  → Supabase: Fetch Client Profile (profiles table)
  → Supabase: Fetch Appointment Details (appointments table)
  → Code Node: Build HTML Invoice
  → HTML to PDF (via Gotenberg, Puppeteer, or external API)
  → Send Email with PDF Attachment
  → Respond to Webhook: { success: true }
```

---

## Node Configuration

### 1. Webhook Node
- **Method:** POST
- **Path:** `/send-quotation`
- **Response Mode:** `responseNode`

### 2. Supabase Node — Fetch Quotation + Items
Use two sequential nodes:

**Node A: Fetch Quote**
```
Table: quotations
Filter: id = {{ $json.body.quoteId }}
```

**Node B: Fetch Items**
```
Table: quotation_items
Filter: quotation_id = {{ quote.id }}
Order: concept ASC
```

### 3. Supabase Node — Fetch Client
```
Table: profiles
Filter: id = {{ quote.client_id }}
```

### 4. Code Node — Build HTML Invoice

```javascript
const quote = $('Fetch Quote').item.json;
const items = $('Fetch Items').all().map(i => i.json);
const client = $('Fetch Client').item.json;

const itemsHtml = items.map(item => `
  <tr>
    <td style="padding: 10px; border-bottom: 1px solid #e0e0e0;">${item.concept}</td>
    <td style="padding: 10px; border-bottom: 1px solid #e0e0e0;">${item.description || ''}</td>
    <td style="padding: 10px; border-bottom: 1px solid #e0e0e0; text-align: center;">${item.quantity}</td>
    <td style="padding: 10px; border-bottom: 1px solid #e0e0e0; text-align: right;">$${parseFloat(item.unit_price).toFixed(2)}</td>
    <td style="padding: 10px; border-bottom: 1px solid #e0e0e0; text-align: right; font-weight: 600;">$${parseFloat(item.subtotal).toFixed(2)}</td>
  </tr>
`).join('');

const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: 'Inter', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #1a1a2e;">
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px;">
    <div>
      <h1 style="color: #2E7D32; margin: 0; font-size: 28px;">LAP Services PTY</h1>
      <p style="color: #666; margin: 4px 0;">Comprometidos con la excelencia!</p>
      <p style="color: #666; font-size: 12px;">PH Sky Level · Ciudad de Panamá · +507 6984-1395</p>
    </div>
    <div style="text-align: right;">
      <h2 style="margin: 0; color: #1a1a2e;">COTIZACIÓN</h2>
      <p style="color: #666;">Nº ${quote.id.substring(0, 8).toUpperCase()}</p>
      <p style="color: #666;">Fecha: ${new Date(quote.created_at).toLocaleDateString('es-PA')}</p>
    </div>
  </div>

  <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
    <h3 style="margin: 0 0 8px;">Cliente</h3>
    <p style="margin: 2px 0;"><strong>${client.name}</strong></p>
    <p style="margin: 2px 0;">${client.email}</p>
    <p style="margin: 2px 0;">${client.phone || ''}</p>
  </div>

  <table style="width: 100%; border-collapse: collapse;">
    <thead>
      <tr style="background: #0D1117; color: white;">
        <th style="padding: 12px; text-align: left;">Concepto</th>
        <th style="padding: 12px; text-align: left;">Descripción</th>
        <th style="padding: 12px; text-align: center;">Cant.</th>
        <th style="padding: 12px; text-align: right;">P. Unit.</th>
        <th style="padding: 12px; text-align: right;">Subtotal</th>
      </tr>
    </thead>
    <tbody>${itemsHtml}</tbody>
  </table>

  <div style="margin-top: 20px; text-align: right;">
    <p>Subtotal: <strong>$${parseFloat(quote.subtotal).toFixed(2)}</strong></p>
    <p>ITBMS (7%): <strong>$${parseFloat(quote.tax).toFixed(2)}</strong></p>
    <hr style="width: 200px; margin-left: auto;">
    <h2 style="color: #2E7D32;">Total: $${parseFloat(quote.total).toFixed(2)}</h2>
  </div>

  <div style="margin-top: 40px; padding: 20px; background: #f8f9fa; border-radius: 8px;">
    <h3>Condiciones</h3>
    <pre style="white-space: pre-wrap; font-family: inherit; color: #666;">${quote.conditions || 'Sin condiciones adicionales.'}</pre>
  </div>

  <p style="text-align: center; margin-top: 40px; color: #999; font-size: 12px;">
    Este documento es una cotización y no constituye una factura fiscal.
  </p>
</body>
</html>
`;

return [{ json: { html, clientEmail: client.email, clientName: client.name, quoteId: quote.id } }];
```

### 5. HTML to PDF Conversion

**Option A: Gotenberg (Self-hosted)**
```
HTTP Request Node:
  Method: POST
  URL: http://gotenberg:3000/forms/chromium/convert/html
  Content-Type: multipart/form-data
  Body: file = {{ $json.html }}
```

**Option B: External API (e.g., html2pdf.app)**
```
HTTP Request Node:
  Method: POST
  URL: https://api.html2pdf.app/v1/generate
  Body: { "html": "{{ $json.html }}", "apiKey": "YOUR_KEY" }
```

### 6. Send Email with Attachment
- **To:** `{{ $json.clientEmail }}`
- **Subject:** `Cotización LAP Services PTY — Nº {{ $json.quoteId.substring(0,8) }}`
- **Body:**
```html
<p>Hola {{ $json.clientName }},</p>
<p>Adjunto encontrarás la cotización para los servicios solicitados.</p>
<p>Puedes aceptar o rechazar la cotización desde tu panel de cliente.</p>
<br>
<p>— LAP Services PTY</p>
```
- **Attachment:** PDF binary from the previous node

### 7. Respond to Webhook
- **Response Code:** 200
- **Body:** `{ "success": true }`

---

## Tax Reference (ITBMS - Panamá)
- Standard rate: **7%**
- Already calculated by the frontend and stored in Supabase
- The PDF just formats the pre-calculated values

---

## Related Skills
- `lap-notification-engine` — For email templates and WhatsApp
- `lap-supabase-integration` — For database connection setup
