// Módulo de dominio: PAGOS Y ABONOS (depósito 50% + pago final 50%).
// Base reutilizable para un futuro módulo de facturación.
import { supabase } from '../../lib/supabase'
import { triggerN8nWebhook } from '../../shared/n8n'

/**
 * Sube el comprobante de pago, marca la cita como 'payment_uploaded' y registra
 * el abono (50%) en la tabla payments.
 * NOTA (Fase 3.5): la lectura del comprobante debe migrar a URLs firmadas sobre
 * un bucket privado; hoy usa getPublicUrl sobre lap_images. Ver SECURITY.md.
 */
export async function uploadPaymentProof(appointmentId, file) {
  // 1. Subir archivo a Supabase Storage
  const fileExt = file.name.split('.').pop()
  const fileName = `payment_${appointmentId}_${Date.now()}.${fileExt}`
  const filePath = `payments/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('lap_images')
    .upload(filePath, file)

  if (uploadError) throw uploadError

  // 2. URL pública
  const { data: publicData } = supabase.storage
    .from('lap_images')
    .getPublicUrl(filePath)

  const paymentUrl = publicData.publicUrl

  // 3. Actualizar cita
  await supabase.from('appointments').update({
    payment_proof_url: paymentUrl,
    status: 'payment_uploaded'
  }).eq('id', appointmentId)

  // 4. Cotización vinculada para calcular el 50%
  const { data: quote } = await supabase
    .from('quotations')
    .select('id, total')
    .eq('appointment_id', appointmentId)
    .eq('status', 'accepted')
    .single()

  if (quote) {
    const depositAmount = Number((quote.total * 0.5).toFixed(2))
    const { error: paymentError } = await supabase.from('payments').insert({
      appointment_id: appointmentId,
      quotation_id: quote.id,
      amount: depositAmount,
      payment_type: 'deposit',
      status: 'pending',
      proof_url: paymentUrl
    })
    if (paymentError) console.warn('Error registrando pago en tabla payments:', paymentError.message)
  }

  // 5. Notificar al admin
  triggerN8nWebhook('/appointment-status', { id: appointmentId, status: 'payment_uploaded' })

  return paymentUrl
}

/** Todos los pagos con datos de cita, cotización y cliente (vista admin). */
export async function getAdminPayments() {
  const { data, error } = await supabase
    .from('payments')
    .select(`
      *,
      appointments(
        id, appointment_date, start_time, location_address, status,
        profiles(name, email),
        appointment_services(services(name))
      ),
      quotations(total, subtotal, tax)
    `)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

/** El admin confirma que recibió el abono y se confirma la cita. */
export async function verifyDeposit(paymentId) {
  const { data: payment, error } = await supabase
    .from('payments')
    .update({ status: 'verified', verified_at: new Date().toISOString() })
    .eq('id', paymentId)
    .select('appointment_id')
    .single()
  if (error) throw error

  if (payment?.appointment_id) {
    await supabase
      .from('appointments')
      .update({ status: 'confirmed' })
      .eq('id', payment.appointment_id)
      .eq('status', 'payment_uploaded')
  }
}

/** Registra el pago final (50% restante) al completar el servicio. */
export async function recordFinalPayment(appointmentId) {
  const { data: quote } = await supabase
    .from('quotations')
    .select('id, total')
    .eq('appointment_id', appointmentId)
    .single()

  if (!quote) return

  const finalAmount = Number((quote.total * 0.5).toFixed(2))

  const { data: existing } = await supabase
    .from('payments')
    .select('id')
    .eq('appointment_id', appointmentId)
    .eq('payment_type', 'final')
    .single()

  if (!existing) {
    await supabase.from('payments').insert({
      appointment_id: appointmentId,
      quotation_id: quote.id,
      amount: finalAmount,
      payment_type: 'final',
      status: 'verified',
      verified_at: new Date().toISOString(),
      notes: 'Pago final asumido al completar el servicio'
    })
  }
}

/** Estadísticas de ingresos para el dashboard. */
export async function getIncomeStats() {
  // Ingresos confirmados: 100% de citas completadas
  const { data: completedQuotes } = await supabase
    .from('quotations')
    .select('total, appointments!inner(status)')
    .eq('appointments.status', 'completed')
  const confirmedIncome = completedQuotes?.reduce((sum, q) => sum + (q.total || 0), 0) || 0

  // Abonos verificados en espera
  const { data: pendingDeposits } = await supabase
    .from('payments')
    .select('amount, appointments!inner(status)')
    .eq('payment_type', 'deposit')
    .eq('status', 'verified')
    .in('appointments.status', ['confirmed', 'payment_uploaded'])
  const depositsInTransit = pendingDeposits?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0

  // Abonos pendientes de verificación
  const { data: pendingVerification } = await supabase
    .from('payments')
    .select('amount')
    .eq('payment_type', 'deposit')
    .eq('status', 'pending')
  const depositsPendingVerification = pendingVerification?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0

  return { confirmedIncome, depositsInTransit, depositsPendingVerification }
}
