# CLAUDE.md — Guía principal del proyecto LAP Services PTY

> **LÉEME PRIMERO.** Este es el archivo de contexto principal. Al iniciar una sesión:
> 1. Lee este archivo completo.
> 2. Lee `docs/ESTADO_DEL_PROYECTO.md` para el estado/avances más recientes y pendientes.
> 3. Consulta los demás docs según necesites (ver "Índice de memoria" abajo).

## Qué es

App web para **LAP Services PTY**, empresa de limpieza y mantenimiento en Panamá.
Los clientes agendan citas y piden cotizaciones por un **wizard**; un panel **admin**
gestiona servicios, citas, cotizaciones, abonos y clientes. Notificaciones (email),
PDFs y sync de calendario vía **Supabase Edge Functions** + **Resend** + **PDFMonkey**
(antes n8n, desactivado por costo; ver migración en `docs/ESTADO_DEL_PROYECTO.md`).

## Stack y comandos

- **Frontend**: React 19 + Vite + React Router. **Backend**: Supabase (Postgres+Auth+Storage, RLS). **Automatización**: n8n.
- `npm run dev` · `npm run build` · `npm run lint` · `npm run test:run` (una vez) · `npm run test` (watch).
- Variables de entorno: solo `VITE_*` en `.env.local` (públicas). Secretos de servidor NO van en `VITE_*`. Ver `SECURITY.md`.

## Arquitectura

### Rutas (`src/App.jsx`)
- **Públicas** (`PublicLayout`): `/` (Landing), `/servicios` (Services), `/agendar` (BookingFlow wizard).
- **Auth**: `/login`, `/registro`.
- **Cliente** (`ProtectedRoute` con sesión): `/mi-panel`, `/mi-panel/citas/:id`, `/mi-panel/cotizaciones/:id`.
- **Admin** (`ProtectedRoute requireRole="admin"` + `AdminLayout`): `/admin` y subrutas
  (calendario, citas, cotizaciones[/nueva|/editar], abonos, servicios, clientes, configuracion).

### Capa de datos — módulos por dominio
`src/services/api.js` es un **BARREL** que re-exporta desde `src/features/<dominio>/api.js`.
Los componentes importan de `'../../services/api'`. Para código nuevo, importa del módulo directo.

```
src/features/
  auth/             login, register, logout, getCurrentUser, savePushSubscription
  appointments/     createAppointment, getAllAppointments, getAppointment,
                    getClientAppointments, updateAppointment, getAvailableSlots
  quotations/       CRUD cotizaciones + ciclo de vida (accept/reject/requestModification),
                    PDFs, sendQuotation
  payments/         uploadPaymentProof, getAdminPayments, verifyDeposit,
                    recordFinalPayment, getIncomeStats   (base para facturación)
  services-catalog/ api.js (getServices/getAllServices/createService/updateService/
                    toggleServiceActive) + catalog.js (SERVICES_LIST + duración, FUENTE ÚNICA)
  clients/          getAllClients, getClients, getClientCount
src/shared/
  notify.js (triggerWorkflow → Edge Function lap-events) · storage.js (uploadImages) · status.js (labels/clases de estado)
```

### Convenciones clave
- **Catálogo de servicios**: la fuente única es `src/features/services-catalog/catalog.js`
  (UUIDs que coinciden con la tabla `services`). No volver a hardcodear listas de servicios.
- **Estados de cita**: usar `APPOINTMENT_STATUS_LABELS`/`_CLASS` de `src/shared/status.js`.
- **Sin Supabase directo en componentes**: pasar siempre por la API del módulo.
- **Automatización (emails/PDFs/calendario)**: pasa por `triggerWorkflow(event, data)`
  (`src/shared/notify.js`) → Edge Function `supabase/functions/lap-events/`. Reemplazó a
  n8n (desactivado). Email vía Resend; PDFs vía PDFMonkey; calendario vía `.ics` por email.
- **Secretos**: nunca en código ni en `VITE_*`. Las API keys (Resend, PDFMonkey) van en
  los Secrets de la Edge Function en Supabase, no en el repo. Ver `SECURITY.md`.

## Base de datos (Supabase)
- Proyecto MCP: `ntcdwswelewwxmyuhbtr`. Operar vía herramientas `mcp__supabase__*`.
- Schema base: `supabase/schema.sql`. Migraciones: `supabase/migrations/` (aplicar en orden).
- Estados de cita: pending → quotation_sent → payment_uploaded → confirmed → completed
  (alterno: modification_requested, cancelled). Pagos: deposit (50%) + final (50%).
- Detalles, RLS, usuario admin y caveats de aplicación: ver `docs/ESTADO_DEL_PROYECTO.md`.

## Índice de memoria / documentación
- **`docs/ESTADO_DEL_PROYECTO.md`** — estado y avances actuales, pendientes (LEER 2º).
- **`SECURITY.md`** — gestión de secretos y rotación de credenciales.
- **`supabase/functions/lap-events/README.md`** — Edge Function que orquesta emails/PDFs/
  calendario (reemplazó a n8n). Secretos y deploy.
- **`AGENTS.md`** — contexto histórico de los workflows n8n (referencia; n8n desactivado).
- **`CALENDAR_SYNC_SETUP.md`** — sync con Google Calendar (histórico; ahora se usa `.ics`).
- **`.agent/skills/`** — skills que documentan los flujos (appointment, notification,
  quotation, supabase, pdfmonkey). Referencia de payloads/plantillas (eran workflows n8n).
- **`README.md`** — setup e índice para humanos.
- Plan de refactor original: `C:\Users\Nestor\.claude\plans\ok-ahora-quiero-que-greedy-dolphin.md`.

## Estado actual (resumen)
Refactor de seguridad + modularización en `master` (commit `ca92e47`). **Migración n8n →
Supabase Edge Functions completa en código** (función `lap-events`, Resend, ICS; n8n
desactivado por costo). Build verde; tests 40/43 (3 fallos preexistentes de UI obsoleta).
**Pendiente**: deploy de la función + secretos/Resend (manual), Fase 3.5 (URLs firmadas
para storage), rotar credenciales (manual), limpiar lint baseline.
Detalles en `docs/ESTADO_DEL_PROYECTO.md`.
