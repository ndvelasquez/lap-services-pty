---
name: pdfmonkey-api
description: Manage PDFMonkey templates and documents via the REST API. Use when updating template HTML/CSS, creating documents, or debugging PDF generation issues.
---

# PDFMonkey API Skill

## Overview
PDFMonkey is a PDF generation SaaS that uses **Liquid** templating syntax. This skill covers how to programmatically manage templates and generate documents via their REST API.

## Authentication
- **API Key**: Stored in the n8n workflow as a Bearer token.
- **Header**: `Authorization: Bearer <SECRET_KEY>`
- **Base URL**: `https://api.pdfmonkey.io/api/v1`

### LAP Services PTY Credentials
- **API Key**: configurada como variable de entorno `PDFMONKEY_API_KEY` / credencial n8n (ver SECURITY.md)
- **Template ID**: `969D81C2-BA26-4F6A-97A2-5CD1E612F87D`
- **Template Name**: `cotizacion`

## Key Concepts

### Draft vs Published
PDFMonkey maintains **two versions** of every template property:
| Property | Draft (editing) | Published (production) |
|---|---|---|
| HTML body | `body_draft` | `body` |
| SCSS styles | `scss_style_draft` | `scss_style` |
| Test data | `sample_data_draft` | `sample_data` |
| Settings | `settings_draft` | `settings` |
| PDF Engine | `pdf_engine_draft_id` | `pdf_engine_id` |

> **⚠️ CRITICAL**: When generating documents via API with `status: "pending"`, PDFMonkey uses the **PUBLISHED** (`body`) version, NOT the draft. Always update BOTH `body` AND `body_draft` when making template changes programmatically.

### Templating Syntax: Liquid (NOT Svelte)
PDFMonkey uses the **Liquid** template language. Common patterns:

```liquid
{# VARIABLES #}
{{ variable_name }}
{{ object.property }}

{# LOOPS #}
{% for item in items %}
  <p>{{ item.name }}</p>
{% endfor %}

{# CONDITIONS #}
{% if variable and variable != "" %}
  <p>{{ variable }}</p>
{% endif %}

{# FILTERS #}
{{ price | money }}
{{ text | newline_to_br }}
{{ number | times: quantity }}
```

> **⚠️ DO NOT USE**: Svelte syntax (`{#each}`, `{#if}`, `{/each}`, `{/if}`) — this will render as literal text in the PDF.

## API Endpoints

### List Templates (Cards)
```
GET /api/v1/document_template_cards?q[workspace_id]=<WORKSPACE_ID>
```
Returns lightweight template cards (id, identifier, is_draft, edition_mode).

### Get Full Template
```
GET /api/v1/document_templates/<TEMPLATE_ID>
```
Returns complete template with body, styles, settings, and test data.

### Update Template
```
PUT /api/v1/document_templates/<TEMPLATE_ID>
Content-Type: application/json

{
  "document_template": {
    "body": "<html>...</html>",
    "body_draft": "<html>...</html>",
    "sample_data": "{\"key\": \"value\"}",
    "sample_data_draft": "{\"key\": \"value\"}"
  }
}
```
Only fields included in the request are updated (partial update).

### Create Document (Generate PDF)
```
POST /api/v1/documents
Content-Type: application/json

{
  "document": {
    "document_template_id": "<TEMPLATE_ID>",
    "payload": { ... dynamic data ... },
    "status": "pending",
    "meta": { ... optional metadata ... }
  }
}
```
Setting `status: "pending"` immediately triggers PDF generation.

### Get Document Status
```
GET /api/v1/documents/<DOCUMENT_ID>
```
Check `document.status`:
- `pending` → being generated
- `success` → PDF ready, `download_url` available
- `failure` → generation failed, check `failure_cause`

## Workflow: Updating a Template

### Step-by-Step
1. **Fetch** the template to see current state:
   ```javascript
   const res = await fetch(`${API_BASE}/document_templates/${TEMPLATE_ID}`, {
     headers: { 'Authorization': `Bearer ${API_KEY}` }
   });
   ```
2. **Update** both published and draft versions:
   ```javascript
   const res = await fetch(`${API_BASE}/document_templates/${TEMPLATE_ID}`, {
     method: 'PUT',
     headers: {
       'Authorization': `Bearer ${API_KEY}`,
       'Content-Type': 'application/json'
     },
     body: JSON.stringify({
       document_template: {
         body: newHTML,
         body_draft: newHTML,
         sample_data: JSON.stringify(testData),
         sample_data_draft: JSON.stringify(testData)
       }
     })
   });
   ```
3. **Verify** by fetching the template again and checking for correct syntax.

### Reference Script
See `scripts/update-pdfmonkey-template.mjs` for a complete, working example.

## LAP Cotización Template Data Schema

The n8n workflow sends this payload to PDFMonkey:

```json
{
  "quote_number": "A1B2C3D4",
  "date": "30/03/2026",
  "client_name": "Juan Pérez",
  "client_email": "juan@ejemplo.com",
  "client_phone": "+507 6123-4567",
  "subtotal": "500.00",
  "tax": "35.00",
  "total": "535.00",
  "conditions": "Line 1\nLine 2",
  "items": [
    {
      "concept": "Limpieza General",
      "description": "Description text",
      "quantity": 1,
      "unit_price": "300.00",
      "subtotal": "300.00"
    }
  ]
}
```

## Troubleshooting

### PDF shows literal template tags
**Cause**: Wrong template syntax (Svelte vs Liquid).
**Fix**: Replace `{#each items as item}` with `{% for item in items %}`, `{#if}` with `{% if %}`, etc.

### PDF is blank
**Cause**: Template has no published body (only `body_draft`).
**Fix**: Update BOTH `body` and `body_draft` via the API.

### `download_url` is empty
**Cause**: Document is still being generated.
**Fix**: Poll the document status endpoint until `status === "success"`.

### `download_url` gives 403
**Cause**: URL has expired (default TTL: 24 hours).
**Fix**: Re-fetch the document to get a fresh URL.
