---
name: lap-appointment-flow
description: Build the n8n webhook workflow for LAP Services PTY appointment processing. Use when creating the /new-appointment webhook, handling appointment creation notifications, and connecting to Supabase for appointment data.
---

# LAP Services — Appointment Flow Workflow

This skill documents how to build the n8n workflow that handles new appointment requests from the LAP Services PTY frontend.

---

## Trigger Context

The frontend (`src/services/api.js`) calls this webhook when a client submits a new appointment booking:

```
POST {N8N_BASE_URL}/new-appointment
Content-Type: application/json
```

### Incoming Payload

```json
{
  "appointment": {
    "id": "uuid",
    "client_id": "uuid",
    "appointment_date": "2026-03-27",
    "start_time": "10:00",
    "end_time": "12:00",
    "location_address": "Av. Principal #42, Apto 7B, Ciudad de Panamá",
    "notes": "Cliente solicita limpieza profunda",
    "status": "pending"
  },
  "services": ["uuid-service-1", "uuid-service-2"]
}
```

---

## Workflow Pattern

```
Webhook (POST /new-appointment)
  → Supabase: Fetch Client Profile (profiles table, by appointment.client_id)
  → Supabase: Fetch Service Names (services table, by service IDs)
  → Set Node: Build formatted message
  → IF: Admin notification preference
    → Branch A: Send Email to Admin (SMTP/Gmail)
    → Branch B: Send WhatsApp to Admin (optional)
  → Send Email to Client: "Tu cita ha sido recibida"
  → Respond to Webhook: { success: true }
```

---

## n8n Node Configuration

### 1. Webhook Node
- **Method:** POST
- **Path:** `/new-appointment`
- **Response Mode:** `responseNode` (we respond at the end)
- **Authentication:** None (internal webhook, called from our frontend)

### 2. Supabase Node — Fetch Client
- **Operation:** Get Many / Get
- **Table:** `profiles`
- **Filter:** `id` equals `{{ $json.body.appointment.client_id }}`
- **Columns:** `name, email, phone`

### 3. Supabase Node — Fetch Services
- **Operation:** Get Many
- **Table:** `services`
- **Filter:** `id` IN `{{ $json.body.services }}`
- **Columns:** `name, category, base_price`

### 4. Set Node — Format Notification
Build a human-readable summary:

```javascript
// Code Node (JavaScript) — Format appointment summary
const appointment = $('Webhook').item.json.body.appointment;
const client = $('Fetch Client').item.json;
const services = $('Fetch Services').all().map(s => s.json.name);

return [{
  json: {
    clientName: client.name,
    clientEmail: client.email,
    clientPhone: client.phone,
    date: appointment.appointment_date,
    time: `${appointment.start_time} - ${appointment.end_time}`,
    location: appointment.location_address,
    services: services.join(', '),
    notes: appointment.notes || 'Sin notas adicionales',
    subject: `Nueva Cita — ${client.name} — ${appointment.appointment_date}`
  }
}];
```

### 5. Send Email Node — Admin Notification
- **To:** `admin@lapservicepty.com` (or from $env)
- **Subject:** `{{ $json.subject }}`
- **HTML Body:**

```html
<h2>🗓️ Nueva Solicitud de Cita</h2>
<p><strong>Cliente:</strong> {{ $json.clientName }}</p>
<p><strong>Email:</strong> {{ $json.clientEmail }}</p>
<p><strong>Teléfono:</strong> {{ $json.clientPhone }}</p>
<p><strong>Fecha:</strong> {{ $json.date }}</p>
<p><strong>Hora:</strong> {{ $json.time }}</p>
<p><strong>Ubicación:</strong> {{ $json.location }}</p>
<p><strong>Servicios:</strong> {{ $json.services }}</p>
<p><strong>Notas:</strong> {{ $json.notes }}</p>
<hr>
<p>Ingresa al panel de administración para confirmar o rechazar esta cita.</p>
```

### 6. Send Email Node — Client Confirmation
- **To:** `{{ $json.clientEmail }}`
- **Subject:** `LAP Services PTY — Tu cita ha sido recibida`
- **HTML Body:**

```html
<h2>✅ ¡Hemos recibido tu solicitud!</h2>
<p>Hola {{ $json.clientName }},</p>
<p>Tu cita para <strong>{{ $json.services }}</strong> el día <strong>{{ $json.date }}</strong> a las <strong>{{ $json.time }}</strong> ha sido registrada exitosamente.</p>
<p>Te confirmaremos la disponibilidad a la brevedad.</p>
<br>
<p>— LAP Services PTY<br>Comprometidos con la excelencia! 🌟</p>
```

### 7. Respond to Webhook
- **Response Code:** 200
- **Response Body:** `{ "success": true, "message": "Appointment notification sent" }`

---

## Supabase Connection

To configure the Supabase node in n8n:
- **Project URL:** `https://ntcdwswelewwxmyuhbtr.supabase.co`
- **API Key:** Use the `service_role` key (NOT the anon key) for server-side access
- **Authentication:** Set the `apikey` header and `Authorization: Bearer <service_role_key>`

---

## Error Handling

Add a **Error Trigger** node connected to a fallback email or Slack notification:
- Log the error details
- Send alert to admin
- The webhook should still return 200 to the frontend (the frontend does not depend on this response)

---

## Testing

1. Register a test client at `http://localhost:5173/registro`
2. Book an appointment at `http://localhost:5173/agendar`
3. Verify the webhook is triggered and emails are sent
4. Check Supabase `appointments` table for the new record

---

## Related Skills
- `lap-notification-engine` — For reusable email/WhatsApp patterns
- `lap-supabase-integration` — For Supabase node configuration details
