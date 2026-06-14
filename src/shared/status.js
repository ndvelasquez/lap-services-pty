// Constantes compartidas de estados (etiquetas y clases de badge).
// Fuente única para evitar duplicar estos mapas en cada vista de citas.

/** Etiquetas legibles para el estado de una cita. */
export const APPOINTMENT_STATUS_LABELS = {
  pending: 'Pendiente',
  quotation_sent: 'Cotización Enviada',
  payment_uploaded: 'Pago en Revisión',
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
  modification_requested: 'Cambio Solicitado'
}

/** Clase de badge (CSS `badge--*`) según el estado de la cita. */
export const APPOINTMENT_STATUS_CLASS = {
  pending: 'pending',
  quotation_sent: 'pending',
  payment_uploaded: 'confirmed',
  confirmed: 'confirmed',
  completed: 'completed',
  cancelled: 'cancelled',
  modification_requested: 'pending'
}
