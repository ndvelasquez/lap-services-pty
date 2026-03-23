---
name: lap-notification-engine
description: Build n8n workflows for LAP Services PTY notifications — welcome emails, appointment status changes, and WhatsApp messages. Use when creating /welcome-email or /appointment-status webhooks.
---

# LAP Services — Notification Engine

This skill covers all notification workflows triggered by the LAP Services PTY frontend.

---

## Overview of Webhook Endpoints

| Endpoint | Trigger | Purpose |
|---|---|---|
| `/welcome-email` | User registration | Send welcome email to new client |
| `/appointment-status` | Admin accepts/cancels/completes a cita | Notify client of status change |

---

## Workflow 1: Welcome Email (`/welcome-email`)

### Incoming Payload
```json
{
  "email": "maria@email.com",
  "name": "María García"
}
```

### Workflow Pattern
```
Webhook (POST /welcome-email)
  → Send Email: Welcome message
  → Respond to Webhook: { success: true }
```

### Email Template
- **To:** `{{ $json.body.email }}`
- **Subject:** `¡Bienvenido/a a LAP Services PTY! 🌟`

```html
<div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 40px 20px;">
  <div style="background: #0D1117; border-radius: 16px; padding: 40px; text-align: center;">
    <h1 style="color: #4CAF50; margin: 0; font-size: 28px;">LAP Services PTY</h1>
    <p style="color: #8b949e; margin: 8px 0 0; font-size: 14px;">Comprometidos con la excelencia!</p>
  </div>

  <div style="background: white; border-radius: 16px; padding: 40px; margin-top: 16px;">
    <h2 style="color: #1a1a2e; margin-top: 0;">¡Hola {{ $json.body.name }}!</h2>
    <p>Nos alegra que te hayas registrado en nuestra plataforma.</p>
    <p>Desde aquí podrás:</p>
    <ul>
      <li>📅 Agendar citas de limpieza y mantenimiento</li>
      <li>💰 Recibir y gestionar cotizaciones</li>
      <li>📸 Enviar fotos de los espacios a limpiar</li>
      <li>📊 Ver el historial de tus servicios</li>
    </ul>
    <a href="https://tu-dominio.com/agendar" style="display: inline-block; background: #2E7D32; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">
      Agenda tu Primera Cita →
    </a>
  </div>

  <div style="text-align: center; padding: 20px; color: #8b949e; font-size: 12px;">
    <p>LAP Services PTY · PH Sky Level · Ciudad de Panamá</p>
    <p>+507 6984-1395</p>
  </div>
</div>
```

---

## Workflow 2: Appointment Status Change (`/appointment-status`)

### Incoming Payload
```json
{
  "id": "appointment-uuid",
  "status": "confirmed"
}
```

Possible status values: `confirmed`, `cancelled`, `completed`

### Workflow Pattern
```
Webhook (POST /appointment-status)
  → Supabase: Fetch Appointment (by id, with client profile)
  → Switch Node: Route by status
    → "confirmed": Send confirmation email/WhatsApp
    → "cancelled": Send cancellation email
    → "completed": Send feedback request email
  → Respond to Webhook: { success: true }
```

### Node Configuration

#### Supabase — Fetch Appointment + Client
```
Table: appointments
Filter: id = {{ $json.body.id }}
```
Then use a second Supabase node to get the client:
```
Table: profiles
Filter: id = {{ $json.client_id }}
```

#### Switch Node
- **Field:** `{{ $json.body.status }}`
- **Rules:**
  - `confirmed` → Output 0
  - `cancelled` → Output 1
  - `completed` → Output 2

### Email Templates by Status

#### Status: `confirmed`
- **Subject:** `✅ Tu cita ha sido confirmada — LAP Services PTY`
```html
<h2>¡Tu cita está confirmada!</h2>
<p>Hola {{ clientName }},</p>
<p>Tu cita del <strong>{{ date }}</strong> a las <strong>{{ time }}</strong> ha sido confirmada.</p>
<p><strong>Ubicación:</strong> {{ location }}</p>
<p>Nuestro equipo estará listo para atenderte. ¡Gracias por confiar en nosotros!</p>
```

#### Status: `cancelled`
- **Subject:** `❌ Cita cancelada — LAP Services PTY`
```html
<h2>Tu cita ha sido cancelada</h2>
<p>Hola {{ clientName }},</p>
<p>Lamentamos informarte que tu cita del <strong>{{ date }}</strong> ha sido cancelada.</p>
<p>Si deseas reagendar, puedes hacerlo desde tu panel de cliente.</p>
```

#### Status: `completed`
- **Subject:** `🌟 ¿Cómo fue tu experiencia? — LAP Services PTY`
```html
<h2>¡Servicio completado!</h2>
<p>Hola {{ clientName }},</p>
<p>Esperamos que hayas quedado satisfecho/a con nuestro servicio.</p>
<p>Nos encantaría conocer tu opinión. ¿Podrías dejarnos una reseña?</p>
<a href="https://tu-dominio.com/mi-panel">Calificar Servicio →</a>
```

---

## WhatsApp Integration (Optional)

If using the WhatsApp Business API or a provider like Twilio:

### n8n Node: HTTP Request
- **Method:** POST
- **URL:** `https://graph.facebook.com/v17.0/{phone-number-id}/messages`
- **Headers:** `Authorization: Bearer {ACCESS_TOKEN}`
- **Body:**
```json
{
  "messaging_product": "whatsapp",
  "to": "{{ $json.clientPhone }}",
  "type": "template",
  "template": {
    "name": "appointment_confirmed",
    "language": { "code": "es" },
    "components": [
      {
        "type": "body",
        "parameters": [
          { "type": "text", "text": "{{ $json.clientName }}" },
          { "type": "text", "text": "{{ $json.date }}" }
        ]
      }
    ]
  }
}
```

---

## Best Practices

### ✅ Do
- Use branded HTML email templates with LAP colors (#0D1117, #2E7D32, #4CAF50)
- Include the company footer with contact info in every email
- Log all sent notifications for audit trail
- Use `SECURITY DEFINER` Supabase functions if needed

### ❌ Don't
- Don't send WhatsApp without user opt-in consent
- Don't include sensitive data (passwords, tokens) in emails
- Don't block the webhook response waiting for email delivery — use async nodes

---

## Related Skills
- `lap-appointment-flow` — For the new appointment webhook
- `lap-quotation-pipeline` — For quotation email delivery
- `lap-supabase-integration` — For Supabase connection setup
