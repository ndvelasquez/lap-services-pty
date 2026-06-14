# LAP Services PTY

Aplicación web para una empresa de servicios de limpieza y mantenimiento en Panamá.
Permite a los clientes agendar citas y solicitar cotizaciones mediante un wizard, y ofrece
un panel administrativo para gestionar servicios, citas, cotizaciones, abonos y clientes.

## Stack

- **Frontend:** React 19 + Vite + React Router
- **Backend:** Supabase (Postgres + Auth + Storage, con RLS)
- **Automatización:** n8n (notificaciones por email, sync con Google Calendar, generación de PDFs vía PDFMonkey)

## Requisitos

- Node.js 18+
- Una instancia de Supabase y otra de n8n (ver `AGENTS.md` y `CALENDAR_SYNC_SETUP.md`)

## Configuración

1. Instalar dependencias:
   ```bash
   npm install
   ```
2. Crear `.env.local` en la raíz con las variables del frontend (sólo `VITE_*` se exponen al cliente):
   ```env
   VITE_SUPABASE_URL=https://<tu-proyecto>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon-key>
   VITE_N8N_BASE_URL=https://<tu-n8n>/webhook
   ```
   > Los secretos de servidor (service-role, API keys de n8n/PDFMonkey/GitHub) **no** van en
   > variables `VITE_*`. Ver [SECURITY.md](SECURITY.md).

## Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo (Vite) |
| `npm run build` | Build de producción |
| `npm run lint` | ESLint |
| `npm run test` | Tests en watch (Vitest) |
| `npm run test:run` | Tests una vez |

Scripts de mantenimiento puntual (despliegue/actualización de workflows n8n y plantillas
PDFMonkey) viven en [`scripts/`](scripts/) y se ejecutan manualmente con sus variables de
entorno (ver cabecera de cada archivo).

## Base de datos

- Schema base: [`supabase/schema.sql`](supabase/schema.sql)
- Migraciones: [`supabase/migrations/`](supabase/migrations/) — aplicar en orden.
- Edge function proxy a n8n: [`supabase/functions/n8n-proxy/`](supabase/functions/n8n-proxy/)

## Estructura

```
src/
  pages/          # vistas (landing, auth, booking, client, admin)
  components/     # layouts, auth (ProtectedRoute), ErrorBoundary, loader
  services/       # api.js — capa de datos sobre Supabase + n8n
  lib/            # cliente supabase, notificaciones, utils
n8n-workflows/    # definiciones de workflows n8n (referencia)
.agent/skills/    # documentación de los flujos para agentes de IA
```

## Documentación adicional

- [AGENTS.md](AGENTS.md) — contexto de automatización n8n
- [CALENDAR_SYNC_SETUP.md](CALENDAR_SYNC_SETUP.md) — sync con Google Calendar
- [SECURITY.md](SECURITY.md) — gestión de secretos y rotación de credenciales
