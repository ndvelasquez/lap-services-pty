/**
 * update-pdfmonkey-template.mjs
 * 
 * Updates the PDFMonkey template via the REST API.
 * 
 * PDFMonkey has two sets of properties:
 *   - `body_draft` / `scss_style_draft` — what you see in the Dashboard editor
 *   - `body` / `scss_style` — the PUBLISHED version used when generating documents
 * 
 * This script updates BOTH so the change takes effect immediately.
 * 
 * Usage: PDFMONKEY_API_KEY=xxxx node update-pdfmonkey-template.mjs
 */

const PDFMONKEY_API_KEY = process.env.PDFMONKEY_API_KEY;
if (!PDFMONKEY_API_KEY) {
  console.error('Falta la variable de entorno PDFMONKEY_API_KEY. Ver SECURITY.md.');
  process.exit(1);
}
const TEMPLATE_ID = '969D81C2-BA26-4F6A-97A2-5CD1E612F87D';
const API_BASE = 'https://api.pdfmonkey.io/api/v1';

// ─── The corrected Liquid template HTML ───────────────────────────────────────
const TEMPLATE_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    :root {
      --primary: #2E7D32;
      --primary-light: #4CAF50;
      --primary-dark: #1B5E20;
      --text: #333333;
      --light-bg: #f1f8f1;
      --border: #c8e6c9;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      color: var(--text);
      line-height: 1.6;
      padding: 40px 50px;
      font-size: 13px;
    }

    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 20px;
      border-bottom: 3px solid var(--primary);
      margin-bottom: 30px;
    }
    .logo {
      color: var(--primary);
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }
    .logo-sub {
      font-size: 11px;
      color: #666;
      margin-top: 2px;
    }
    .quote-header {
      text-align: right;
    }
    .quote-title {
      font-size: 28px;
      font-weight: 800;
      color: var(--primary);
      letter-spacing: 2px;
    }
    .quote-meta {
      font-size: 12px;
      color: #666;
      margin-top: 4px;
    }
    .quote-meta strong {
      color: var(--text);
    }

    /* Client box */
    .client-box {
      background: var(--light-bg);
      border-left: 4px solid var(--primary);
      padding: 16px 20px;
      margin-bottom: 30px;
      border-radius: 0 6px 6px 0;
    }
    .client-box h3 {
      color: var(--primary);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 8px;
    }
    .client-box p {
      margin: 2px 0;
      font-size: 13px;
    }

    /* Items table */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    thead th {
      background: var(--primary);
      color: white;
      padding: 10px 14px;
      text-align: left;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
    }
    thead th:nth-child(3),
    thead th:nth-child(4) {
      text-align: right;
    }
    tbody td {
      padding: 10px 14px;
      border-bottom: 1px solid var(--border);
      vertical-align: top;
    }
    tbody td:nth-child(3),
    tbody td:nth-child(4) {
      text-align: right;
      white-space: nowrap;
    }
    tbody tr:nth-child(even) {
      background: #fafbfc;
    }
    .item-concept {
      font-weight: 600;
      color: var(--text);
    }
    .item-desc {
      font-size: 11px;
      color: #888;
      margin-top: 2px;
    }

    /* Totals */
    .totals {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 30px;
    }
    .totals-box {
      width: 260px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      font-size: 13px;
    }
    .totals-row.total-final {
      border-top: 2px solid var(--primary);
      margin-top: 6px;
      padding-top: 10px;
      font-size: 18px;
      font-weight: 800;
      color: var(--primary);
    }

    /* Conditions */
    .conditions {
      background: var(--light-bg);
      padding: 20px 24px;
      border-radius: 8px;
      border: 1px solid var(--border);
      margin-bottom: 30px;
    }
    .conditions h3 {
      color: var(--primary);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 10px;
    }
    .conditions p {
      font-size: 12px;
      color: #555;
      line-height: 1.7;
    }

    /* Footer */
    .footer {
      text-align: center;
      font-size: 10px;
      color: #999;
      border-top: 1px solid var(--border);
      padding-top: 16px;
      margin-top: 40px;
    }
    .footer p { margin: 2px 0; }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div class="header">
    <div>
      <div class="logo">LAP Services PTY</div>
      <div class="logo-sub">Ciudad de Panamá &middot; Tel: +507 6984-1395</div>
    </div>
    <div class="quote-header">
      <div class="quote-title">COTIZACIÓN</div>
      <div class="quote-meta">
        N° <strong>{{ quote_number }}</strong><br>
        Fecha: <strong>{{ date }}</strong>
      </div>
    </div>
  </div>

  <!-- CLIENT INFO -->
  <div class="client-box">
    <h3>Datos del Cliente</h3>
    <p><strong>{{ client_name }}</strong></p>
    {% if client_email and client_email != "" %}
      <p>{{ client_email }}</p>
    {% endif %}
    {% if client_phone and client_phone != "" %}
      <p>{{ client_phone }}</p>
    {% endif %}
  </div>

  <!-- ITEMS TABLE -->
  <table>
    <thead>
      <tr>
        <th style="width: 55%">Concepto / Descripción</th>
        <th style="width: 10%; text-align: center;">Cant.</th>
        <th style="width: 17%">Precio Unit.</th>
        <th style="width: 18%">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      {% for item in items %}
      <tr>
        <td>
          <div class="item-concept">{{ item.concept }}</div>
          {% if item.description and item.description != "" %}
            <div class="item-desc">{{ item.description }}</div>
          {% endif %}
        </td>
        <td style="text-align: center;">{{ item.quantity }}</td>
        <td>\${{ item.unit_price }}</td>
        <td>\${{ item.subtotal }}</td>
      </tr>
      {% endfor %}
    </tbody>
  </table>

  <!-- TOTALS -->
  <div class="totals">
    <div class="totals-box">
      <div class="totals-row">
        <span>Subtotal</span>
        <span>\${{ subtotal }}</span>
      </div>
      <div class="totals-row">
        <span>ITBMS (7%)</span>
        <span>\${{ tax }}</span>
      </div>
      <div class="totals-row total-final">
        <span>Total</span>
        <span>\${{ total }}</span>
      </div>
    </div>
  </div>

  <!-- CONDITIONS -->
  {% if conditions and conditions != "" %}
  <div class="conditions">
    <h3>Términos y Condiciones</h3>
    <p>{{ conditions | newline_to_br }}</p>
  </div>
  {% endif %}

  <!-- FOOTER -->
  <div class="footer">
    <p><strong>LAP SERVICES PTY</strong></p>
    <p>Ciudad de Panamá | +507 6984-1395 | info@lapservicespty.com</p>
    <p style="margin-top: 8px;">Esta cotización tiene una validez de 15 días calendario.</p>
  </div>

</body>
</html>`;

// ─── Sample test data for preview ─────────────────────────────────────────────
const SAMPLE_DATA = JSON.stringify({
  quote_number: "A1B2C3D4",
  date: "30/03/2026",
  client_name: "Juan Pérez",
  client_email: "juan@ejemplo.com",
  client_phone: "+507 6123-4567",
  subtotal: "500.00",
  tax: "35.00",
  total: "535.00",
  conditions: "Pago 50% anticipado.\nResto al finalizar el servicio.\nValidez: 15 días.",
  items: [
    {
      concept: "Limpieza General",
      description: "Limpieza profunda de oficinas incluyendo pisos, baños y áreas comunes",
      quantity: 1,
      unit_price: "300.00",
      subtotal: "300.00"
    },
    {
      concept: "Mantenimiento A/C",
      description: "Servicio preventivo para 2 unidades de aire acondicionado",
      quantity: 2,
      unit_price: "100.00",
      subtotal: "200.00"
    }
  ]
});

// ─── Step 1: Fetch current template to confirm it exists ──────────────────────
async function fetchTemplate() {
  console.log('📋 Step 1: Fetching current template...');
  const res = await fetch(`${API_BASE}/document_templates/${TEMPLATE_ID}`, {
    headers: { 'Authorization': `Bearer ${PDFMONKEY_API_KEY}` }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch template: ${res.status} ${text}`);
  }

  const data = await res.json();
  const tpl = data.document_template;
  console.log(`  ✅ Template found: "${tpl.identifier}"`);
  console.log(`  📝 Edition mode: ${tpl.edition_mode}`);
  console.log(`  🔧 Engine: ${tpl.pdf_engine_id || 'default'}`);
  
  // Check if the current body contains the old Svelte syntax
  const hasOldSyntax = tpl.body?.includes('{#each') || tpl.body_draft?.includes('{#each');
  console.log(`  ⚠️  Has old Svelte syntax: ${hasOldSyntax ? 'YES (needs fix!)' : 'No'}`);
  
  return tpl;
}

// ─── Step 2: Update template via PUT ──────────────────────────────────────────
async function updateTemplate() {
  console.log('\n🔄 Step 2: Updating template with correct Liquid syntax...');
  
  const payload = {
    document_template: {
      // Update BOTH published and draft versions
      body: TEMPLATE_HTML,
      body_draft: TEMPLATE_HTML,
      // Update sample/test data for preview
      sample_data: SAMPLE_DATA,
      sample_data_draft: SAMPLE_DATA
    }
  };

  const res = await fetch(`${API_BASE}/document_templates/${TEMPLATE_ID}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${PDFMONKEY_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to update template: ${res.status} ${text}`);
  }

  const data = await res.json();
  const tpl = data.document_template;
  console.log(`  ✅ Template updated successfully!`);
  console.log(`  📅 Updated at: ${tpl.updated_at}`);
  
  // Verify
  const bodyHasLiquid = tpl.body?.includes('{% for item in items %}');
  const draftHasLiquid = tpl.body_draft?.includes('{% for item in items %}');
  console.log(`  ✅ Published body uses Liquid: ${bodyHasLiquid}`);
  console.log(`  ✅ Draft body uses Liquid: ${draftHasLiquid}`);
  
  return tpl;
}

// ─── Step 3: Verification ─────────────────────────────────────────────────────
async function verifyTemplate() {
  console.log('\n🔍 Step 3: Final verification...');
  const res = await fetch(`${API_BASE}/document_templates/${TEMPLATE_ID}`, {
    headers: { 'Authorization': `Bearer ${PDFMONKEY_API_KEY}` }
  });

  const data = await res.json();
  const tpl = data.document_template;
  
  const checks = [
    ['Published body has {% for %}', tpl.body?.includes('{% for item in items %}')],
    ['Published body has {{ item.concept }}', tpl.body?.includes('{{ item.concept }}')],
    ['Published body has {% if conditions %}', tpl.body?.includes('{% if conditions')],
    ['No old {#each} syntax in published', !tpl.body?.includes('{#each')],
    ['No old {#if} syntax in published', !tpl.body?.includes('{#if')],
    ['Draft body has {% for %}', tpl.body_draft?.includes('{% for item in items %}')],
  ];

  let allPassed = true;
  for (const [label, passed] of checks) {
    console.log(`  ${passed ? '✅' : '❌'} ${label}`);
    if (!passed) allPassed = false;
  }

  if (allPassed) {
    console.log('\n🎉 ALL CHECKS PASSED! Template is ready for PDF generation.');
  } else {
    console.log('\n⚠️  Some checks failed. Please review.');
  }

  return allPassed;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  PDFMonkey Template Updater — LAP Services PTY');
  console.log('  Template ID: ' + TEMPLATE_ID);
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    await fetchTemplate();
    await updateTemplate();
    const success = await verifyTemplate();
    process.exit(success ? 0 : 1);
  } catch (err) {
    console.error('\n❌ ERROR:', err.message);
    process.exit(1);
  }
}

main();
