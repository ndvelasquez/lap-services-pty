// Edge Function "lap-events": orquestador único que reemplaza los workflows de n8n.
// Recibe { event, data } desde el frontend (src/shared/notify.js) y enruta a un handler
// por evento. Re-obtiene los datos desde Supabase con la service-role key (no confía en
// el payload del cliente), envía emails vía Resend, genera PDFs vía PDFMonkey y adjunta
// archivos .ics para la sincronización de calendario.
//
// Secretos requeridos (Supabase → Edge Functions → Secrets):
//   RESEND_API_KEY      · API key de Resend
//   PDFMONKEY_API_KEY   · API key de PDFMonkey
//   ALLOWED_ORIGIN      · dominio del frontend (ej. https://lapservicepty.com)
//   ADMIN_EMAIL         · (opcional) correo del admin; default ndvelasquezl@gmail.com
//   FROM_EMAIL          · (opcional) remitente; default LAP Services PTY <noreply@lapservicepty.com>
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase automáticamente.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || ''
const PDFMONKEY_API_KEY = Deno.env.get('PDFMONKEY_API_KEY') || ''
// Allowlist de orígenes (CORS). ALLOWED_ORIGIN admite varios separados por coma.
// Se incluyen localhost para desarrollo local; en producción usa tu dominio.
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGIN') || 'https://lapservicepty.com')
  .split(',').map((o) => o.trim()).filter(Boolean)
  .concat(['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'])
function originFor(req: Request): string {
  const o = req.headers.get('Origin') || ''
  return ALLOWED_ORIGINS.includes(o) ? o : ALLOWED_ORIGINS[0]
}
const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') || 'ndvelasquezl@gmail.com'
// PRUEBA DE CONCEPTO (sin dominio): Resend exige remitente onboarding@resend.dev y solo
// entrega al email con el que te registraste en Resend. Cuando tengas el dominio verificado,
// define el secreto FROM_EMAIL='LAP Services PTY <noreply@tudominio.com>' (sin tocar código).
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'LAP Services PTY <onboarding@resend.dev>'
const QUOTATIONS_BUCKET = 'lap_quotations'
const PDF_TEMPLATE_ID = '969D81C2-BA26-4F6A-97A2-5CD1E612F87D'

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const corsHeaders = (req: Request) => ({
  'Access-Control-Allow-Origin': originFor(req),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface Attachment { filename: string; content: string } // content = base64

async function sendEmail(opts: { to: string | string[]; subject: string; html: string; attachments?: Attachment[] }) {
  if (!RESEND_API_KEY) { console.warn('RESEND_API_KEY no configurada; email omitido'); return }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: Array.isArray(opts.to) ? opts.to : [opts.to],
      subject: opts.subject,
      html: opts.html,
      attachments: opts.attachments,
    }),
  })
  if (!res.ok) {
    const txt = await res.text()
    console.error('Resend error:', res.status, txt)
    throw new Error(`Resend ${res.status}: ${txt}`)
  }
  return await res.json()
}

// Envío best-effort: un destinatario que falle (p. ej. email inválido) se registra pero
// NO aborta el resto de notificaciones ni las escrituras a BD del handler.
async function safeSend(opts: { to: string | string[]; subject: string; html: string; attachments?: Attachment[] }): Promise<boolean> {
  try { await sendEmail(opts); return true }
  catch (e) { console.error(`Email a ${opts.to} falló (se continúa):`, (e as Error).message); return false }
}

const fmtDate = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString('es-PA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const hhmm = (t?: string) => (t ? t.slice(0, 5) : '')
const money = (n: unknown) => Number(n ?? 0).toFixed(2)

const shell = (inner: string) =>
  `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">` +
  `<div style="background:#0D1117;border-radius:12px;padding:24px;text-align:center;">` +
  `<h1 style="color:#4CAF50;margin:0;">LAP Services PTY</h1></div>` +
  `<div style="background:white;border-radius:12px;padding:24px;margin-top:12px;border:1px solid #e0e0e0;">${inner}</div>` +
  `<div style="text-align:center;padding:16px;color:#8b949e;font-size:12px;">` +
  `<p>LAP Services PTY · Ciudad de Panamá · +507 6984-1395</p></div></div>`

const row = (k: string, v: string) =>
  `<tr><td style="padding:8px 12px;font-weight:bold;background:#f5f5f5;">${k}</td><td style="padding:8px 12px;">${v}</td></tr>`

// Construye un archivo .ics (VCALENDAR/VEVENT) a partir de los datos de la cita.
function buildICS(p: {
  id: string; date: string; start_time: string; end_time: string;
  summary: string; description: string; location: string
}): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const now = new Date()
  const dtstamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`
  const toIcs = (d: string, t: string) => `${d.replace(/-/g, '')}T${t.replace(/:/g, '').slice(0, 6)}`
  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//LAP Services//Panama//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT', `UID:${p.id}@lapservicepty.com`, `DTSTAMP:${dtstamp}`,
    `DTSTART;TZID=America/Panama:${toIcs(p.date, p.start_time)}`,
    `DTEND;TZID=America/Panama:${toIcs(p.date, p.end_time)}`,
    `SUMMARY:${esc(p.summary)}`, `LOCATION:${esc(p.location)}`, `DESCRIPTION:${esc(p.description)}`,
    'STATUS:CONFIRMED', 'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n')
}

const b64 = (s: string) => btoa(unescape(encodeURIComponent(s)))

const gcalUrl = (p: { date: string; start_time: string; end_time: string; summary: string; location: string }) => {
  const toIcs = (d: string, t: string) => `${d.replace(/-/g, '')}T${t.replace(/:/g, '').slice(0, 6)}`
  const e = encodeURIComponent
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${e(p.summary)}` +
    `&dates=${toIcs(p.date, p.start_time)}/${toIcs(p.date, p.end_time)}` +
    `&location=${e(p.location)}&details=${e('Cita confirmada con LAP Services Panamá.')}`
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

async function handleNewAppointment(data: { id: string }) {
  const { data: appt, error } = await admin
    .from('appointments')
    .select('*, profiles!appointments_client_id_fkey(name,email,phone), appointment_services(services(name))')
    .eq('id', data.id)
    .single()
  if (error || !appt) throw new Error(`Cita no encontrada: ${error?.message}`)

  const client = appt.profiles || {}
  const serviceNames = (appt.appointment_services || []).map((s: any) => s.services?.name).filter(Boolean).join(', ') || 'N/A'
  const fecha = fmtDate(appt.appointment_date)
  const hora = `${hhmm(appt.start_time)} – ${hhmm(appt.end_time)}`
  const location = appt.location_address || 'N/A'

  const adminTable = `<table style="width:100%;border-collapse:collapse;">${
    row('Cliente', client.name || 'Cliente') + row('Email', `<a href="mailto:${client.email}">${client.email || ''}</a>`) +
    row('Teléfono', client.phone || 'N/A') + row('Servicios', serviceNames) + row('Fecha', fecha) +
    row('Hora', hora) + row('Dirección', location)}</table>`

  await Promise.all([
    safeSend({
      to: ADMIN_EMAIL,
      subject: `🗓️ Nueva Cita — ${client.name || 'Cliente'}`,
      html: shell(`<h2 style="color:#1a1a2e;">🗓️ Nueva Solicitud de Cita</h2>${adminTable}` +
        `<p style="margin-top:20px;color:#666;">Ve a <a href="https://lapservicepty.com/admin/citas">Admin → Citas</a> para gestionarla.</p>`),
    }),
    client.email ? safeSend({
      to: client.email,
      subject: 'LAP Services PTY — Tu cita ha sido recibida ✅',
      html: shell(`<h2 style="color:#1a1a2e;">✅ ¡Solicitud recibida!</h2>` +
        `<p>Hola <strong>${client.name || 'Cliente'}</strong>,</p>` +
        `<p>Hemos recibido tu solicitud de cita para <strong>${serviceNames}</strong>.</p>` +
        `<table style="width:100%;border-collapse:collapse;margin:16px 0;">${row('Fecha', fecha) + row('Hora', hora)}</table>` +
        `<p>Te notificaremos cuando tu cita sea confirmada.</p>`),
    }) : Promise.resolve(),
  ])
  return { success: true, message: 'Appointment notifications sent' }
}

async function handleAppointmentStatus(data: { id: string; status: string; notes?: string }) {
  const { data: appt } = await admin
    .from('appointments')
    .select('*, profiles!appointments_client_id_fkey(name,email,phone), appointment_services(services(name))')
    .eq('id', data.id)
    .single()
  const client = appt?.profiles || {}
  const serviceNames = (appt?.appointment_services || []).map((s: any) => s.services?.name).filter(Boolean).join(', ') || 'N/A'
  const fecha = appt?.appointment_date ? fmtDate(appt.appointment_date) : 'N/A'
  const labels: Record<string, string> = {
    confirmed: 'Confirmada', cancelled: 'Cancelada', completed: 'Completada',
    quotation_sent: 'Cotización enviada', modification_requested: 'Cambios solicitados',
    payment_uploaded: 'Comprobante de pago subido',
  }
  const label = labels[data.status] || data.status

  // Notificación al admin para todo cambio de estado.
  await safeSend({
    to: ADMIN_EMAIL,
    subject: `[LAP Admin] Cita ${label} — ${client.name || 'Cliente'}`,
    html: shell(`<h2 style="color:#1a1a2e;">🔔 Cambio de estado: ${label}</h2>` +
      `<table style="width:100%;border-collapse:collapse;">${
        row('Cliente', client.name || 'Cliente') + row('Servicios', serviceNames) + row('Fecha', fecha) +
        row('Nuevo estado', label) + (data.notes ? row('Notas', data.notes) : '')}</table>` +
      `<p style="margin-top:16px;color:#666;"><a href="https://lapservicepty.com/admin/citas/${data.id}">Ver cita en el panel</a></p>`),
  })

  // Notificación al cliente para estados que le conciernen (confirmed lo maneja calendar-sync).
  if (client.email && (data.status === 'cancelled' || data.status === 'completed')) {
    const map: Record<string, { subject: string; body: string }> = {
      cancelled: {
        subject: '❌ Cita cancelada — LAP Services PTY',
        body: `<h2>Tu cita ha sido cancelada</h2><p>Hola ${client.name || 'Cliente'},</p>` +
          `<p>Lamentamos informarte que tu cita del <strong>${fecha}</strong> ha sido cancelada.</p>` +
          `<p>Si deseas reagendar, puedes hacerlo desde tu panel de cliente.</p>`,
      },
      completed: {
        subject: '🌟 ¿Cómo fue tu experiencia? — LAP Services PTY',
        body: `<h2>¡Servicio completado!</h2><p>Hola ${client.name || 'Cliente'},</p>` +
          `<p>Esperamos que hayas quedado satisfecho/a con nuestro servicio.</p>` +
          `<p><a href="https://lapservicepty.com/mi-panel">Calificar Servicio →</a></p>`,
      },
    }
    await safeSend({ to: client.email, subject: map[data.status].subject, html: shell(map[data.status].body) })
  }
  return { success: true }
}

async function handleCalendarSync(data: { id: string; status: string }) {
  if (data.status !== 'confirmed') return { skipped: true, reason: 'status_not_confirmed' }

  const { data: appt, error } = await admin
    .from('appointments')
    .select('*, profiles!appointments_client_id_fkey(name,email,phone), appointment_services(services(name))')
    .eq('id', data.id)
    .single()
  if (error || !appt) throw new Error(`Cita no encontrada: ${error?.message}`)

  const client = appt.profiles || {}
  const serviceNames = (appt.appointment_services || []).map((s: any) => s.services?.name).filter(Boolean).join(', ') || 'Servicio LAP'
  const fecha = fmtDate(appt.appointment_date)
  const hora = `${hhmm(appt.start_time)} – ${hhmm(appt.end_time)}`
  const location = appt.location_address || ''
  const summary = `Servicio LAP: ${serviceNames}${client.name ? ' - ' + client.name : ''}`
  const description = `Servicios: ${serviceNames}\nCliente: ${client.name || ''}\nTeléfono: ${client.phone || 'n/a'}\nNotas: ${appt.notes || 'Ninguna'}`

  const ics = buildICS({ id: appt.id, date: appt.appointment_date, start_time: appt.start_time, end_time: appt.end_time, summary, description, location })
  const attachments: Attachment[] = [{ filename: `LAP-cita-${appt.id}.ics`, content: b64(ics) }]
  const gcal = gcalUrl({ date: appt.appointment_date, start_time: appt.start_time, end_time: appt.end_time, summary, location })

  const detailTable = `<table style="width:100%;border-collapse:collapse;margin:16px 0;">${
    row('Servicios', serviceNames) + row('Fecha', fecha) + row('Hora', hora) + row('Dirección', location)}</table>`
  const gcalBtn = `<p style="text-align:center;margin:24px 0;"><a href="${gcal}" style="background:#2E7D32;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block;">📅 Agregar a Google Calendar</a></p>`

  await Promise.all([
    client.email ? safeSend({
      to: client.email,
      subject: `Tu cita con LAP Services está confirmada — ${fecha}`,
      html: shell(`<h2 style="color:#1B5E20;">✅ ¡Tu cita está confirmada!</h2><p>Hola <b>${client.name || 'Cliente'}</b>,</p>${detailTable}` +
        `<p>Adjuntamos el evento (.ics) para que lo agregues a tu calendario con un clic.</p>${gcalBtn}`),
      attachments,
    }) : Promise.resolve(),
    safeSend({
      to: ADMIN_EMAIL,
      subject: `[LAP Admin] Cita confirmada: ${client.name || 'Cliente'} — ${fecha}`,
      html: shell(`<h2 style="color:#1B5E20;">📋 Cita Confirmada</h2>${detailTable}${gcalBtn}`),
      attachments,
    }),
  ])

  await admin.from('appointments').update({ calendar_sync_status: 'fallback_ics' }).eq('id', appt.id)
  return { success: true, calendar_sync_status: 'fallback_ics' }
}

async function handleGenerateQuotationPdf(data: { quoteId: string }) {
  if (!PDFMONKEY_API_KEY) throw new Error('PDFMONKEY_API_KEY no configurada')

  const { data: quote, error } = await admin
    .from('quotations')
    .select('*, profiles(name,email,phone), quotation_items(*)')
    .eq('id', data.quoteId)
    .single()
  if (error || !quote) throw new Error(`Cotización no encontrada: ${error?.message}`)
  const client = quote.profiles || {}
  const items = (quote.quotation_items || []).sort((a: any, b: any) => (a.id > b.id ? 1 : -1))

  const payload = {
    document: {
      document_template_id: PDF_TEMPLATE_ID,
      status: 'pending',
      payload: {
        quote_number: String(quote.id).substring(0, 8).toUpperCase(),
        date: new Date().toLocaleDateString('es-PA'),
        client_name: client.name, client_email: client.email, client_phone: client.phone || '',
        subtotal: money(quote.subtotal), tax: money(quote.tax), total: money(quote.total),
        conditions: quote.conditions || '',
        items: items.map((i: any) => ({
          concept: i.concept, description: i.description || '', quantity: i.quantity,
          unit_price: money(i.unit_price), subtotal: money(i.subtotal),
        })),
      },
      meta: { quoteId: quote.id },
    },
  }

  // 1. Crear el documento en PDFMonkey
  const createRes = await fetch('https://api.pdfmonkey.io/api/v1/documents', {
    method: 'POST',
    headers: { Authorization: `Bearer ${PDFMONKEY_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!createRes.ok) throw new Error(`PDFMonkey create ${createRes.status}: ${await createRes.text()}`)
  const docId = (await createRes.json()).document.id

  // 2. Poll hasta que el PDF esté listo (success) o falle
  let downloadUrl = ''
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 2000))
    const statusRes = await fetch(`https://api.pdfmonkey.io/api/v1/documents/${docId}`, {
      headers: { Authorization: `Bearer ${PDFMONKEY_API_KEY}` },
    })
    const doc = (await statusRes.json()).document
    if (doc.status === 'success') { downloadUrl = doc.download_url; break }
    if (doc.status === 'failure') throw new Error(`PDFMonkey falló: ${doc.failure_cause || 'desconocido'}`)
  }
  if (!downloadUrl) throw new Error('PDFMonkey timeout: el PDF no se generó a tiempo')

  // 3. Descargar el PDF y subirlo a Supabase Storage
  const pdfBlob = await (await fetch(downloadUrl)).blob()
  const filePath = `Cotizacion_${quote.id}.pdf`
  const { error: upErr } = await admin.storage
    .from(QUOTATIONS_BUCKET)
    .upload(filePath, pdfBlob, { contentType: 'application/pdf', upsert: true })
  if (upErr) throw new Error(`Storage upload: ${upErr.message}`)

  const pdfUrl = `${SUPABASE_URL}/storage/v1/object/public/${QUOTATIONS_BUCKET}/${filePath}`

  // 4. Actualizar la cotización
  await admin.from('quotations')
    .update({ pdf_url: pdfUrl, pdf_version: (quote.pdf_version || 0) + 1 })
    .eq('id', quote.id)

  return { success: true, message: 'PDF generated', quotation_id: quote.id, pdf_url: pdfUrl }
}

async function handleSendQuotation(data: { quoteId: string }) {
  const { data: quote, error } = await admin
    .from('quotations')
    .select('total, pdf_url, profiles(name,email)')
    .eq('id', data.quoteId)
    .single()
  if (error || !quote) throw new Error(`Cotización no encontrada: ${error?.message}`)
  const client: any = quote.profiles || {}
  if (!quote.pdf_url) throw new Error('La cotización no tiene PDF generado')
  if (!client.email) throw new Error('El cliente no tiene email')

  // Descargar el PDF de Storage y adjuntarlo
  const pdfBuf = await (await fetch(quote.pdf_url)).arrayBuffer()
  const bytes = new Uint8Array(pdfBuf)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  const pdfB64 = btoa(bin)

  await sendEmail({
    to: client.email,
    subject: `Cotización LAP Services PTY — Total: $${money(quote.total)}`,
    html: shell(`<p>Hola ${client.name || 'Cliente'},</p>` +
      `<p>Adjunto encontrarás la cotización solicitada con el detalle y condiciones aplicables.</p>` +
      `<p>Quedamos a tu disposición para cualquier consulta adicional.</p>` +
      `<p>Atentamente,<br><strong>El Equipo de LAP Services PTY</strong></p>`),
    attachments: [{ filename: `Cotizacion_${String(data.quoteId).substring(0, 8).toUpperCase()}.pdf`, content: pdfB64 }],
  })
  return { success: true, message: 'Quotation sent successfully' }
}

async function handleWelcomeEmail(data: { email: string; name: string }) {
  if (!data.email) return { skipped: true, reason: 'no_email' }
  await sendEmail({
    to: data.email,
    subject: '¡Bienvenido/a a LAP Services PTY! 🌟',
    html: shell(`<h2 style="color:#1a1a2e;margin-top:0;">¡Hola ${data.name || ''}!</h2>` +
      `<p>Nos alegra que te hayas registrado en nuestra plataforma.</p><p>Desde aquí podrás:</p>` +
      `<ul><li>📅 Agendar citas de limpieza y mantenimiento</li><li>💰 Recibir y gestionar cotizaciones</li>` +
      `<li>📸 Enviar fotos de los espacios a limpiar</li><li>📊 Ver el historial de tus servicios</li></ul>` +
      `<a href="https://lapservicepty.com/agendar" style="display:inline-block;background:#2E7D32;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:16px;">Agenda tu Primera Cita →</a>`),
  })
  return { success: true }
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const handlers: Record<string, (data: any) => Promise<unknown>> = {
  'new-appointment': handleNewAppointment,
  'appointment-status': handleAppointmentStatus,
  'calendar-sync': handleCalendarSync,
  'gen-quotation-pdf-v5': handleGenerateQuotationPdf,
  'send-quotation': handleSendQuotation,
  'welcome-email': handleWelcomeEmail,
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { headers: { ...cors, 'Content-Type': 'application/json' }, status })

  try {
    const { event, data } = await req.json()
    const handler = handlers[event]
    if (!handler) return json({ error: `Evento desconocido: ${event}` }, 400)
    return json(await handler(data || {}))
  } catch (err) {
    console.error('lap-events error:', err)
    return json({ error: (err as Error).message || 'Error interno' }, 500)
  }
})
