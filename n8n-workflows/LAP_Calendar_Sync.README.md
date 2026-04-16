# LAP Calendar Sync — Setup Manual

Workflow: `LAP_Calendar_Sync.json`

Crea automáticamente un evento en Google Calendar cuando una cita pasa a `confirmed`, invita al cliente por email, y cae en un fallback `.ics` si Google Calendar no responde.

## Disparador

El frontend llama al webhook `/calendar-sync` desde `updateAppointment()` en [src/services/api.js](../src/services/api.js) cada vez que `status` cambia a `confirmed`. No es necesario tocar el frontend.

Payload que recibe: `{ id: <appointment_uuid>, status: "confirmed" }`

## Pasos para activarlo

### 1. Importar el workflow a n8n

- Entrar a n8n en `https://n8n.srv1444974.hstgr.cloud`.
- Usuario: `ndvelasquezl@gmail.com`
- Contraseña: `BsDNhBEgbcH5weD`
- Menú → Workflows → **Import from File** → seleccionar `LAP_Calendar_Sync.json`.

### 2. Configurar credencial de Google Calendar

- En n8n: **Credentials → New → Google Calendar OAuth2 API**.
- Seguir el wizard: crear un OAuth Client ID en Google Cloud Console (tipo "Web application"), autorizar el redirect URL que n8n muestra, pegar Client ID + Secret.
- Autenticar con la cuenta de Google del admin de LAP (es el calendario donde aparecerán los eventos).
- Copiar el **ID** de la credencial recién creada.
- Abrir el nodo **Create Google Calendar Event** del workflow y reemplazar `REPLACE_WITH_GCAL_CRED_ID` por ese ID. Alternativamente, desde el nodo seleccionar la credencial del dropdown.

### 3. Configurar credencial SMTP

- **Credentials → New → SMTP** con los datos del proveedor de correo (Gmail SMTP, SendGrid, Resend SMTP relay, el que uses en los otros workflows de LAP).
- `fromEmail` por defecto es `no-reply@lapservicepty.com` — cámbialo en el nodo **Send Confirmation Email** si tu proveedor exige otro remitente.
- Abrir el nodo **Send Confirmation Email** y seleccionar la credencial.

### 4. Credencial Supabase

- Ya existe (`Supabase account`, id `gsQUFcI43y3e2L9D`). Verificar que los 3 nodos HTTP apunten a ella.

### 5. Activar el workflow

- Toggle **Active** en la esquina superior derecha del editor.
- n8n registra el webhook en la URL `https://n8n.srv1444974.hstgr.cloud/webhook/calendar-sync`.

## Verificación end-to-end

1. Migración ya aplicada (columnas `google_event_id` y `calendar_sync_status` en `appointments`).
2. Crear cita de prueba como cliente desde `/agendar`.
3. Como admin, confirmarla desde `/admin/citas`.
4. Esperar ~3-5 segundos y verificar:
   - Evento aparece en Google Calendar del admin con el cliente como attendee.
   - Cliente recibe correo de Google (invitación) + correo de LAP (confirmación con botón "Agregar a Google Calendar").
   - En Supabase, la cita tiene `calendar_sync_status = 'synced'` y un `google_event_id`.
   - En la tabla de admin aparece un chip verde `📅 Calendar` junto al estado.

## Test del fallback ICS

- En el workflow, desactivar temporalmente la credencial del nodo Google Calendar (o poner un calendar ID inválido).
- Confirmar otra cita.
- Verificar que:
   - El correo llega con adjunto `.ics`.
   - En Supabase `calendar_sync_status = 'fallback_ics'`.
   - La tabla de admin muestra un chip naranja `📅 ICS`.

## Notas

- Si migras el proyecto a otra instancia de n8n, solo necesitas reimportar el JSON y reconfigurar las 2 credenciales (Google Calendar + SMTP).
- El workflow es idempotente: si se dispara dos veces para la misma cita, creará dos eventos. Si esto es un problema, agregar un IF node tras **Fetch Appointment** que salga temprano cuando `google_event_id IS NOT NULL`.
