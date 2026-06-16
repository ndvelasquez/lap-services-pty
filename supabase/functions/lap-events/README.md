# Edge Function: `lap-events`

Orquestador único de automatizaciones de LAP Services PTY. **Reemplaza a n8n** (que vivía
en Hostinger y se desactivó por costo). Mantiene el costo en ~$0 usando el plan gratuito de
Supabase Edge Functions + Resend, conservando PDFMonkey.

El frontend la invoca vía `src/shared/notify.js` → `triggerWorkflow(event, data)` →
`supabase.functions.invoke('lap-events', { body: { event, data } })`.

## Eventos (router interno)

| `event` | Disparado por | Acción |
|---|---|---|
| `new-appointment` | `createAppointment` | Email al admin + email de confirmación al cliente |
| `appointment-status` | cambios de estado | Email al admin; email al cliente si `cancelled`/`completed` |
| `calendar-sync` | cita → `confirmed` | Email a cliente y admin con `.ics` adjunto; marca `calendar_sync_status='fallback_ics'` |
| `gen-quotation-pdf-v5` | generar/regenerar PDF | PDFMonkey (crear→poll→descargar) → Storage `lap_quotations` → actualiza `quotations` |
| `send-quotation` | enviar cotización | Descarga el PDF de Storage y lo envía al cliente como adjunto |
| `welcome-email` | registro | Email de bienvenida |

La función **re-obtiene** cita/cotización/cliente desde Supabase con la service-role key;
el frontend solo envía IDs (no confía en el payload del cliente).

## Secretos (Supabase → Edge Functions → Secrets)

| Secreto | Requerido | Notas |
|---|---|---|
| `RESEND_API_KEY` | sí | API key de Resend |
| `PDFMONKEY_API_KEY` | sí (para PDFs) | API key de PDFMonkey |
| `ALLOWED_ORIGIN` | recomendado | `https://lapservicepty.com` (CORS) |
| `ADMIN_EMAIL` | opcional | default `ndvelasquezl@gmail.com` |
| `FROM_EMAIL` | opcional | default `LAP Services PTY <noreply@lapservicepty.com>` |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | — | inyectados automáticamente por Supabase |

> **Nunca** poner estos secretos en `VITE_*` ni en el repo.

## Modo de prueba (sin dominio propio)

Mientras no haya un dominio verificado, Resend funciona en **modo prueba**:
- El remitente **debe** ser `onboarding@resend.dev` (es el default actual de `FROM_EMAIL`).
- Solo entrega correos **al email con el que te registraste en Resend**; a cualquier otro
  destinatario responde 403. Por eso, para probar, usa ese mismo email como cliente y como
  `ADMIN_EMAIL`.
- Único secreto imprescindible para probar emails: `RESEND_API_KEY` (PDFMonkey solo hace
  falta para los eventos de PDF).

Cuando adquieras el dominio: verifícalo en Resend (DNS SPF/DKIM) y define el secreto
`FROM_EMAIL='LAP Services PTY <noreply@tudominio.com>'`. No hay que tocar código.

## Pasos para activar (producción, con dominio)

1. Crear cuenta en **Resend** y **verificar el dominio** propio
   (agregar los registros DNS SPF/DKIM que indica Resend). Sin esto, los emails no se envían.
2. Configurar los secretos de arriba (incluido `FROM_EMAIL` con tu dominio).
3. Deploy:
   ```bash
   supabase functions deploy lap-events --project-ref ntcdwswelewwxmyuhbtr
   # o por MCP: mcp__supabase__deploy_edge_function
   supabase secrets set RESEND_API_KEY=... PDFMONKEY_API_KEY=... ALLOWED_ORIGIN=https://lapservicepty.com
   ```

## Notas

- **Calendario**: ya no se usa Google Calendar OAuth. Se adjunta un `.ics` y un botón
  "Agregar a Google Calendar" en el email. El badge "ICS" del admin lee
  `calendar_sync_status='fallback_ics'`.
- **PDFs**: template PDFMonkey `969D81C2-BA26-4F6A-97A2-5CD1E612F87D`. El payload replica
  exactamente el del antiguo workflow n8n (`n8n-workflows/LAP_Generar_PDF_Cotizacion.json`).
- Los JSON en `n8n-workflows/` se conservan solo como referencia histórica.
