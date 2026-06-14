# Seguridad — LAP Services PTY

Este documento lista las credenciales que deben rotarse y cómo se gestionan los secretos
en el proyecto. **Ningún secreto debe vivir en el código fuente ni en archivos versionados.**

## 1. Credenciales a rotar (acción manual del propietario)

Durante la auditoría se detectaron claves expuestas en el código o en el historial de git.
Aunque ya se eliminaron del código, **siguen siendo válidas hasta que las rotes** en cada
panel correspondiente.

| Credencial | Dónde estaba expuesta | Dónde rotar | Prioridad |
|---|---|---|---|
| **PDFMonkey API key** (`TY8pHuwBHW644uRbVBk4`) | `update-pdfmonkey-template.mjs` y workflow n8n — **commiteada en git (c16f036)** | Dashboard PDFMonkey → API Keys | 🔴 Crítica (está en historial) |
| **Supabase service-role** (`SUPABASE_ACCESS_TOKEN`, `sbp_...`) | `.env.local`, `.mcp.json` (no commiteados) | Supabase → Account → Access Tokens | 🔴 Crítica |
| **n8n API key** (`N8N_API_KEY`) | `.env.local`, `.mcp.json` | n8n → Settings → API | 🟠 Alta (además expira) |
| **GitHub PAT** (`ghp_...`) | `.env.local`, `.mcp.json` | GitHub → Settings → Developer settings → Tokens | 🟠 Alta |
| **Google API key** (`GOOGLE_API_KEY`) | `.env.local` | Google Cloud Console → Credentials | 🟡 Media |
| **Supabase anon key** | fallback en `src/lib/supabase.js` (eliminado) | No requiere rotación (es pública por diseño), pero confirma que las RLS estén activas | 🟢 Baja |

> La anon key de Supabase es pública por naturaleza (se expone en el cliente). Su seguridad
> depende **exclusivamente de las políticas RLS**, no de mantenerla secreta.

### Historial de git
La PDFMonkey key quedó en el commit `c16f036`. Rotarla es obligatorio. Si se quiere además
purgar del historial, usar `git filter-repo` o BFG sobre el repo (coordinar antes de reescribir
historia si hay clones/forks).

## 2. Gestión de secretos

- **Frontend (Vite):** sólo variables `VITE_*` en `.env.local`. Cualquier `VITE_*` se incrusta
  en el bundle y es **pública** — nunca poner ahí service-role keys ni secretos de servidor.
- **Scripts (`scripts/*.mjs`):** leer de `process.env` (ej. `PDFMONKEY_API_KEY=xxx node ...`).
- **n8n:** las API keys (PDFMonkey, SMTP, Google) van en **n8n Credentials**, no en el JSON
  del workflow.
- **`.env.local` y `.mcp.json`** están en `.gitignore` y verificados como **nunca commiteados**.

## 3. Pendientes de hardening (ver plan de modularización, Fase 1.4)

- Edge function `supabase/functions/n8n-proxy`: restringir CORS al dominio de producción y
  validar header `X-Webhook-Secret`.
- Webhooks n8n (`/new-appointment`, `/calendar-sync`): añadir validación de secreto compartido.
- `uploadPaymentProof` (`src/services/api.js`): los comprobantes de pago se suben con
  `getPublicUrl` al bucket `lap_images`. Migrar a URLs firmadas (`createSignedUrl`) sobre un
  bucket privado para que los comprobantes no sean accesibles por adivinación de URL.
- Externalizar el email admin (`ndvelasquezl@gmail.com`) hardcodeado en los workflows n8n.
