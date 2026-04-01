---
name: lap-quotation-pipeline
description: Build the n8n webhook workflow for LAP Services PTY quotation delivery. Use when creating the /send-quotation webhook, generating PDF quotations, and emailing them to clients.
---

# LAP Services — Quotation Pipeline Workflow

This skill documents how to build the n8n workflow that generates and sends quotations (cotizaciones) to LAP Services PTY clients.

---

## Webhooks Available

| Webhook | Method | Purpose |
|---------|--------|---------|
| `/generate-quotation-pdf` | POST | Generate PDF and save to Storage |
| `/send-quotation` | POST | Send PDF via email to client |

---

## 1. Generate PDF Webhook

### Trigger Context

The frontend (`src/services/api.js`) calls this webhook when an admin clicks "Generar PDF" in the Quotation Builder:

```
POST {N8N_BASE_URL}/generate-quotation-pdf
Content-Type: application/json
```

### Incoming Payload
```json
{
  "quoteId": "uuid-of-quotation",
  "regenerate": false,
  "sendAfterGenerate": false
}
```

> **Note:** If `regenerate: true`, the workflow will increment the version and overwrite the previous PDF.

---

### Workflow Pattern

```
Webhook (POST /generate-quotation-pdf)
  → Supabase: Fetch Quotation + Items + Client
  → Supabase: Get Current PDF Version
  → Code Node: Build HTML Invoice
  → HTML to PDF (via Gotenberg or external API)
  → Supabase Storage: Upload PDF (bucket: lap_documents)
  → Supabase: Update quotation (pdf_url, pdf_version, pdf_generated_at)
  → Optional: Send Email (if sendAfterGenerate: true)
  → Respond: { success: true, pdf_url, version }
```

---

### Node Configuration

#### 1. Webhook Node
- **Method:** POST
- **Path:** `/generate-quotation-pdf`
- **Response Mode:** `responseNode`

#### 2. Supabase Node — Fetch Full Quotation
```
Table: quotations
Filter: id = {{ $json.body.quoteId }}
```

Then chain to fetch items:
```
Table: quotation_items
Filter: quotation_id = {{ quote.id }}
Order: created_at ASC
```

And fetch client:
```
Table: profiles
Filter: id = {{ quote.client_id }}
```

#### 3. Supabase Node — Get Current Version
```
Table: quotations
Filter: id = {{ $json.body.quoteId }}
Select: pdf_version
```

#### 4. Code Node — Build Filename and HTML Invoice

```javascript
const quote = $('Fetch Quote').item.json;
const items = $('Fetch Items').all().map(i => i.json);
const client = $('Fetch Client').item.json;
const regenerate = $('Webhook').item.json.body.regenerate || false;

const currentVersion = quote.pdf_version || 1;
const newVersion = regenerate ? currentVersion + 1 : currentVersion;

const date = new Date(quote.created_at).toISOString().split('T')[0];
const clientName = (client.name || 'Cliente').replace(/[^a-zA-Z0-9]/g, '_');
const fileName = `${clientName}_${date}_v${newVersion}.pdf`;

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

return [{ 
  json: { 
    html, 
    clientEmail: client.email, 
    clientName: client.name, 
    quoteId: quote.id,
    fileName,
    newVersion
  } 
}];
```

#### 5. HTML to PDF Conversion

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

#### 6. Supabase Storage — Upload PDF
```
Bucket: lap_documents
Path: quotations/{{ $json.fileName }}
File: {{ $binary.data }}
```

#### 7. Supabase — Update Quotation
```
Table: quotations
Filter: id = {{ $json.quoteId }}
Update:
  pdf_url: https://ntcdwswelewwxmyuhbtr.supabase.co/storage/v1/object/public/lap_documents/quotations/{{ $json.fileName }}
  pdf_version: {{ $json.newVersion }}
  pdf_generated_at: {{ $now }}
```

#### 8. Optional: Send Email (if sendAfterGenerate: true)
Use an IF node to check `sendAfterGenerate`:
- **To:** `{{ $json.clientEmail }}`
- **Subject:** `Cotización LAP Services PTY — Nº {{ $json.quoteId.substring(0,8) }}`
- **Attachment:** PDF binary

#### 9. Respond to Webhook
- **Response Code:** 200
- **Body:** 
```json
{
  "success": true,
  "pdf_url": "https://.../lap_documents/quotations/...",
  "version": {{ $json.newVersion }}
}
```

---

## 2. Send Quotation Webhook (Modified)

### Incoming Payload
```json
{
  "quoteId": "uuid-of-quotation"
}
```

> **Note:** This webhook now checks if PDF exists. If not, it calls the generate workflow first.

### Workflow Pattern

```
Webhook (POST /send-quotation)
  → Supabase: Fetch Quotation (check pdf_url)
  → IF: pdf_url exists
    → Continue to send email
  → ELSE
    → Call /generate-quotation-pdf (via HTTP Request)
  → Send Email with PDF Attachment
  → Respond: { success: true }
```

---

## 3. Tax Reference (ITBMS - Panamá)
- Standard rate: **7%**
- Already calculated by the frontend and stored in Supabase
- The PDF just formats the pre-calculated values

---

## 4. Storage Bucket Configuration

### Bucket: `lap_documents`
- **Type:** Private
- **File size limit:** 10MB
- **Allowed MIME types:** application/pdf

### RLS Policies Required:
1. **Admins can upload** — INSERT with role = 'admin'
2. **Admins can view all** — SELECT with role = 'admin'  
3. **Clients can view own** — SELECT if pdf_url matches their quotation

---

## Related Skills
- `lap-notification-engine` — For email templates and WhatsApp
- `lap-supabase-integration` — For database connection setup
