---
name: lap-supabase-integration
description: Configure the Supabase connection in n8n for LAP Services PTY. Use when setting up Supabase credentials, connecting to the database, uploading to Storage, or referencing table schemas inside n8n workflows.
---

# LAP Services — Supabase Integration for n8n

This skill documents how to connect n8n to the LAP Services PTY Supabase project and reference all database tables correctly.

---

## Supabase Project Details

| Field | Value |
|---|---|
| **Project URL** | `https://ntcdwswelewwxmyuhbtr.supabase.co` |
| **Region** | Supabase Cloud |
| **Auth Method** | Email/Password |
| **Frontend Key** | `anon` (public, used by React) |
| **n8n Key** | `service_role` (private, used by server-side workflows) |

> ⚠️ **CRITICAL:** In n8n, always use the `service_role` key, NOT the `anon` key. The service role key bypasses Row Level Security (RLS), which is necessary for automation workflows that read/write data across all users.

---

## n8n Credential Setup

### Option 1: Supabase Node (Built-in)
1. In n8n, go to **Credentials → Add Credential → Supabase**
2. Fill in:
   - **Host:** `https://ntcdwswelewwxmyuhbtr.supabase.co`
   - **Service Role Key:** `(paste your service_role key from Supabase → Settings → API)`

### Option 2: HTTP Request (for REST API access)
If the built-in Supabase node doesn't support a specific operation:
```
URL: https://ntcdwswelewwxmyuhbtr.supabase.co/rest/v1/{table_name}
Headers:
  apikey: {service_role_key}
  Authorization: Bearer {service_role_key}
  Content-Type: application/json
  Prefer: return=representation
```

---

## Database Schema Reference

### Table: `profiles`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | Synced with `auth.users` |
| name | TEXT | Full name |
| email | TEXT | Unique |
| phone | TEXT | Optional |
| address | TEXT | Optional |
| role | ENUM | `'client'` or `'admin'` |
| created_at | TIMESTAMPTZ | Auto-generated |

### Table: `services`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | Auto-generated |
| name | TEXT | Service name |
| category | TEXT | e.g., "Espacios", "Muebles", "AC" |
| description | TEXT | Optional |
| base_price | DECIMAL(10,2) | Starting price |
| active | BOOLEAN | Default `true` |
| created_at | TIMESTAMPTZ | Auto-generated |

### Table: `appointments`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | Auto-generated |
| client_id | UUID (FK) | References `profiles.id` |
| appointment_date | DATE | e.g., `2026-03-27` |
| start_time | TIME | e.g., `10:00` |
| end_time | TIME | e.g., `12:00` |
| status | ENUM | `'pending'`, `'confirmed'`, `'completed'`, `'cancelled'` |
| location_address | TEXT | Full address |
| notes | TEXT | Optional |
| created_at | TIMESTAMPTZ | Auto-generated |

### Table: `appointment_services`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | Auto-generated |
| appointment_id | UUID (FK) | References `appointments.id` |
| service_id | UUID (FK) | References `services.id` |
| custom_details | JSONB | Dynamic form data (space type, furniture count, AC brand, etc.) |
| images | TEXT[] | Array of Supabase Storage URLs |

### Table: `quotations`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | Auto-generated |
| appointment_id | UUID (FK) | References `appointments.id` |
| client_id | UUID (FK) | References `profiles.id` |
| status | ENUM | `'draft'`, `'sent'`, `'accepted'`, `'rejected'` |
| subtotal | DECIMAL(10,2) | Before tax |
| tax | DECIMAL(10,2) | ITBMS 7% |
| total | DECIMAL(10,2) | Final total |
| conditions | TEXT | Terms & conditions |
| created_at | TIMESTAMPTZ | Auto-generated |

### Table: `quotation_items`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | Auto-generated |
| quotation_id | UUID (FK) | References `quotations.id` |
| concept | TEXT | Line item name |
| description | TEXT | Optional detail |
| quantity | INTEGER | Default 1 |
| unit_price | DECIMAL(10,2) | Per unit |
| subtotal | DECIMAL(10,2) | qty × unit_price |

---

## Common n8n Queries

### Fetch Appointment with Client and Services
```
Table: appointments
Filter: id = {{ $json.body.id }}
```
Then chain:
```
Table: profiles
Filter: id = {{ $json.client_id }}
```
```
Table: appointment_services
Filter: appointment_id = {{ $json.id }}
```

### Fetch Full Quotation
```
Table: quotations
Filter: id = {{ $json.body.quoteId }}
```
Then:
```
Table: quotation_items
Filter: quotation_id = {{ $json.id }}
```

### List Today's Appointments
Use an HTTP Request node with PostgREST syntax:
```
GET https://ntcdwswelewwxmyuhbtr.supabase.co/rest/v1/appointments?appointment_date=eq.2026-03-22&order=start_time.asc
```

---

## Storage (Image Access)

The bucket `lap_images` is public. To access uploaded images:
```
https://ntcdwswelewwxmyuhbtr.supabase.co/storage/v1/object/public/lap_images/uploads/{filename}
```

To **embed images in emails** from n8n, use the full public URL directly in `<img>` tags.

---

## Webhook Endpoints Summary

These are the webhooks the React frontend triggers that n8n must handle:

| Webhook Path | HTTP Method | Triggered By | Purpose |
|---|---|---|---|
| `/welcome-email` | POST | User registration | Send welcome email |
| `/new-appointment` | POST | Client books cita | Notify admin + confirm to client |
| `/appointment-status` | POST | Admin changes status | Notify client of change |
| `/send-quotation` | POST | Admin sends quote | Generate PDF, email to client |

---

## Best Practices

### ✅ Do
- Use `service_role` key in n8n (bypasses RLS)
- Use `anon` key only in the React frontend
- Always add error handling nodes
- Log webhook payloads for debugging
- Use `Prefer: return=representation` header for INSERT/UPDATE

### ❌ Don't
- Don't expose the `service_role` key in the frontend
- Don't use the anon key in n8n (RLS will block cross-user queries)
- Don't hardcode UUIDs — always reference them from the webhook payload

---

## Related Skills
- `lap-appointment-flow` — New appointment webhook workflow
- `lap-notification-engine` — Email and WhatsApp notifications
- `lap-quotation-pipeline` — PDF generation and quotation delivery
