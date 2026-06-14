# Estado del Proyecto — LAP Services PTY

> Snapshot de avances para continuar tras un `/clear`. Última actualización: 2026-06-14.
> Lee también `CLAUDE.md` (índice principal) y el plan en
> `C:\Users\Nestor\.claude\plans\ok-ahora-quiero-que-greedy-dolphin.md`.

## Resumen ejecutivo

Auditoría + refactor en 3 fases sobre la app LAP (React+Vite+Supabase+n8n). Todo
commiteado en `master` (commit `ca92e47`). App funcional, build verde, BD configurada.

| Fase | Estado |
|---|---|
| Fase 1 — Seguridad e integridad | ✅ Completada |
| Fase 2 — Limpieza de cruft | ✅ Completada |
| Fase 3 — Modularización por features | ✅ Completada (core) |
| Fase 3.5 — Storage con URLs firmadas | ⏳ Pendiente (documentada en el plan) |
| Rotación de credenciales (manual) | ⏳ Pendiente del usuario |

## Fase 1 — Seguridad (hecho)

- **ProtectedRoute** (`src/components/auth/ProtectedRoute.jsx`): guard de rutas.
  En `src/App.jsx`, `/admin/*` exige rol admin y `/mi-panel/*` exige sesión.
- **Migración `supabase/migrations/0001_fix_status_and_payments.sql`**: enum
  `appointment_status` ampliado (quotation_sent, payment_uploaded,
  modification_requested), tabla `payments` con RLS, columna
  `appointments.payment_proof_url`, buckets de storage. **YA APLICADA en Supabase.**
- **Credenciales fuera del código**: `src/lib/supabase.js` sin fallback hardcodeado;
  `scripts/update-pdfmonkey-template.mjs` lee `PDFMONKEY_API_KEY` de env; workflow
  n8n usa `{{ $env.PDFMONKEY_API_KEY }}`. Ver `SECURITY.md`.
- **Edge function** `supabase/functions/n8n-proxy/index.ts`: CORS restringido,
  header `X-Webhook-Secret`, sin fuga de `error.message`.
- **Bugs**: ErrorBoundary (`src/components/ErrorBoundary.jsx` en `main.jsx`),
  validación tipo/tamaño de comprobantes (`AppointmentDetail.jsx`), persistencia
  del wizard en sessionStorage (`BookingFlow.jsx`).

## Fase 2 — Limpieza (hecho)

- Borrado: `test_output.txt`, `wf_fixed.json`, `walkthrough.md`, `tmp/`, `superpowers/`.
- Movido: scripts `.mjs` → `scripts/`; edge function → `supabase/functions/n8n-proxy/`.
- `README.md` reescrito (específico de LAP).

## Fase 3 — Modularización (hecho)

Estructura nueva de la capa de datos/lógica reutilizable:

```
src/
  features/
    auth/            api.js, index.js
    appointments/    api.js, index.js
    quotations/      api.js, index.js
    payments/        api.js, index.js          (base para facturación futura)
    services-catalog/ api.js, catalog.js, index.js
    clients/         api.js, index.js
  shared/
    n8n.js           (triggerN8nWebhook)
    storage.js       (uploadImages)
    status.js        (APPOINTMENT_STATUS_LABELS / _CLASS)
  services/
    api.js           BARREL: re-exporta todo desde features/ (compat total)
```

- `src/services/api.js` quedó como **barrel** → los componentes y tests siguen
  importando de `'../../services/api'` sin cambios.
- **Catálogo dedup**: `src/features/services-catalog/catalog.js` es la fuente única
  (SERVICES_LIST con UUIDs, constantes, `estimateServiceDuration`). BookingFlow lo importa.
- **Constantes de estado** centralizadas en `src/shared/status.js` (antes duplicadas
  en AdminAppointments, ClientDashboard, AppointmentDetail).
- **Sin Supabase directo en componentes**: `AdminServices` y `AdminDashboard` ahora
  usan la API del módulo (`getAllServices`, `updateService`, `toggleServiceActive`,
  `getClientCount`).
- Contratos `index.js` por feature (listos para extraer a paquetes npm).

**NO hecho a propósito**: mover los componentes de página a `src/features/*` (churn
alto, valor bajo — la frontera reutilizable ya está en api/hooks/catálogo/constantes).

## Estado de la base de datos (Supabase)

- Proyecto: `ntcdwswelewwxmyuhbtr` (ndvelasquez's Project, us-east-1). Estaba **pausado**
  y **vacío**; se reactivó y se aplicó schema base + migración 0001.
- **7 tablas** con RLS activo, **0 políticas permisivas**. Se corrigió un hueco grave:
  `profiles`/`appointments` tenían políticas `USING(true)` (fuga de PII / acceso total)
  → reemplazadas por scoped (cliente ve lo suyo, admin todo). `payments` endurecida.
- **Buckets**: `lap_documents` y `lap_quotations` **privados**; `lap_images` público
  (lo usa `uploadImages`/`uploadPaymentProof` con getPublicUrl).
- **Catálogo**: 17 servicios sembrados (mismos UUIDs que `catalog.js`).
- **Usuario admin**: `ndvelasquezl@gmail.com` (rol `admin`). Password temporal
  `LapAdmin2026!` → debe cambiarse.

## Verificación actual

- `npm run build` ✅ · `npm run test:run` → **40/43** (3 fallos PREEXISTENTES de UI
  obsoleta en AdminAppointments/AdminQuotations: buscan títulos de botones que
  cambiaron; NO son regresiones). · Lint: 63 errores preexistentes (baseline del
  repo, en QuotationBuilder/api.test.js/setup.js), 0 introducidos por el refactor.

## Pendientes

1. **Fase 3.5 — Storage con URLs firmadas** (en el plan, sección 3.5): migrar lectura
   de `proof_url`/`pdf_url` a `createSignedUrl`. Toca `payments`/`quotations` api +
   `AppointmentDetail.jsx:444` + `AdminAbonos.jsx:224` + workflow n8n + políticas
   storage (las de `lap_documents`/`lap_quotations` son "carpeta propia" y no matchean
   el esquema real de rutas). No bloqueante: no hay datos aún.
2. **Rotar credenciales** (manual del usuario): PDFMonkey (estaba en historial git),
   Supabase service-role, n8n API key, GitHub PAT, Google API key. Ver `SECURITY.md`.
3. **Tests stale-UI** (3): actualizar expectativas de AdminAppointments/AdminQuotations
   a los títulos de botones actuales.
4. **Lint baseline**: limpiar los 63 errores preexistentes (QuotationBuilder unused
   imports, setup.js `global`→`globalThis`, api.test.js unused vars).

## Cómo aplicar migraciones / operar la BD

- Vía MCP de Supabase (`mcp__supabase__apply_migration` / `execute_sql`) con
  `project_id=ntcdwswelewwxmyuhbtr`. Requiere `SUPABASE_ACCESS_TOKEN` válido en el
  MCP (si se rota, reiniciar Claude Code para recargar `.mcp.json`).
- Las políticas de `storage.objects` **no** se crean por SQL (el rol de migración no
  es owner) → se crean por el Dashboard de Supabase.
- `ALTER TYPE ... ADD VALUE` debe ir en migración separada de su uso.
