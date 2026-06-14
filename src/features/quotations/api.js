// Módulo de dominio: COTIZACIONES (quotations) y su ciclo de vida.
import { supabase } from '../../lib/supabase'
import { triggerN8nWebhook } from '../../shared/n8n'
import { updateAppointment } from '../appointments/api'

export async function getQuotationById(quoteId) {
  const { data: quote, error } = await supabase
    .from('quotations')
    .select('*')
    .eq('id', quoteId)
    .single()
  if (error) throw error

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, email, phone')
    .eq('id', quote.client_id)
    .single()

  let appointmentData = null
  if (quote.appointment_id) {
    const { data: appointment } = await supabase
      .from('appointments')
      .select('appointment_date, start_time, location_address, appointment_services(custom_details, services(name))')
      .eq('id', quote.appointment_id)
      .single()
    appointmentData = appointment
  }

  const { data: items } = await supabase
    .from('quotation_items')
    .select('*')
    .eq('quotation_id', quoteId)
    .order('id', { ascending: true })

  return {
    ...quote,
    profiles: profile,
    appointments: appointmentData,
    items: items || []
  }
}

export async function updateQuotation(quoteId, data) {
  const { subtotal = 0, tax = 0, total = 0, items, conditions } = data
  const subtotalVal = Number(Number(subtotal).toFixed(2))
  const taxVal = Number(Number(tax).toFixed(2))
  const totalVal = Number(Number(total).toFixed(2))

  const { error: updateError } = await supabase
    .from('quotations')
    .update({ conditions, subtotal: subtotalVal, tax: taxVal, total: totalVal })
    .eq('id', quoteId)

  if (updateError) throw updateError

  if (items) {
    await supabase.from('quotation_items').delete().eq('quotation_id', quoteId)

    const itemsToInsert = items.map(i => ({
      quotation_id: quoteId,
      concept: i.concept,
      description: i.description,
      quantity: i.quantity,
      unit_price: i.unitPrice,
      subtotal: i.quantity * i.unitPrice
    }))

    const { error: itemsError } = await supabase
      .from('quotation_items')
      .insert(itemsToInsert)

    if (itemsError) throw itemsError
  }

  return await getQuotationById(quoteId)
}

export async function generateQuotationPdf(quotationId) {
  return await triggerN8nWebhook('/gen-quotation-pdf-v5', { quoteId: quotationId, regenerate: false }, 'POST')
}

export async function regenerateQuotationPdf(quotationId) {
  return await triggerN8nWebhook('/gen-quotation-pdf-v5', { quoteId: quotationId, regenerate: true }, 'POST')
}

export async function createQuotation(data) {
  const { appointmentId, clientId, items, conditions, taxRate } = data
  const subtotal = Number(items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0).toFixed(2))
  const tax = Number((subtotal * taxRate).toFixed(2))
  const total = Number((subtotal + tax).toFixed(2))

  // 1. Insertar cotización
  const { data: quote, error: quoteError } = await supabase
    .from('quotations')
    .insert([{
      appointment_id: appointmentId,
      client_id: clientId,
      status: 'draft',
      subtotal, tax, total, conditions
    }])
    .select()
    .single()

  if (quoteError) throw quoteError

  // 2. Insertar ítems
  const itemsToInsert = items.map(i => ({
    quotation_id: quote.id,
    concept: i.concept,
    description: i.description,
    quantity: i.quantity,
    unit_price: i.unitPrice,
    subtotal: i.quantity * i.unitPrice
  }))

  const { error: itemsError } = await supabase
    .from('quotation_items')
    .insert(itemsToInsert)

  if (itemsError) throw itemsError
  return quote
}

export async function getClientQuotations(clientId) {
  const { data, error } = await supabase
    .from('quotations')
    .select('*, appointments(appointment_date)')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getAllQuotations() {
  const { data, error } = await supabase
    .from('quotations')
    .select('*, profiles(name, email), appointments(appointment_date)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

/** Envía la cotización vía n8n (genera PDF si falta, o reenvía el existente). */
export async function sendQuotation(quoteId) {
  const { data: quote } = await supabase
    .from('quotations')
    .select('pdf_url, status, appointment_id')
    .eq('id', quoteId)
    .single()

  if (!quote) throw new Error('Quotation not found')

  if (!quote.pdf_url) {
    await triggerN8nWebhook('/gen-quotation-pdf-v5', { quoteId: quoteId, regenerate: false }, 'POST')
  } else {
    await triggerN8nWebhook('/send-quotation', { quoteId: quoteId })
  }

  if (quote.status === 'draft') {
    await supabase.from('quotations').update({ status: 'sent' }).eq('id', quoteId)
  }
  if (quote.appointment_id) {
    await updateAppointment(quote.appointment_id, { status: 'quotation_sent' })
  }

  return { success: true }
}

export async function deleteQuotation(quoteId) {
  const { data: quote, error: fetchError } = await supabase
    .from('quotations')
    .select('status')
    .eq('id', quoteId)
    .single()

  if (fetchError) throw fetchError
  if (quote.status === 'accepted') {
    throw new Error('No se puede eliminar una cotización aceptada')
  }

  const { error } = await supabase
    .from('quotations')
    .delete()
    .eq('id', quoteId)

  if (error) throw error
  return true
}

export async function getQuotationByAppointmentId(appointmentId) {
  const { data, error } = await supabase
    .from('quotations')
    .select('*, quotation_items(*)')
    .eq('appointment_id', appointmentId)
    .single()
  if (error) throw error
  return data
}

// --- Ciclo de vida desde el lado del cliente ---

export async function acceptQuotation(quoteId, appointmentId) {
  await supabase.from('quotations').update({ status: 'accepted' }).eq('id', quoteId)
  await supabase.from('appointments').update({ status: 'quotation_sent' }).eq('id', appointmentId)
  triggerN8nWebhook('/appointment-status', { id: appointmentId, status: 'quotation_sent' })
}

export async function rejectQuotation(quoteId, appointmentId) {
  await supabase.from('quotations').update({ status: 'rejected' }).eq('id', quoteId)
  await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', appointmentId)
  triggerN8nWebhook('/appointment-status', { id: appointmentId, status: 'cancelled' })
}

export async function requestModification(appointmentId, notes) {
  await supabase.from('appointments').update({ status: 'modification_requested', notes }).eq('id', appointmentId)
  triggerN8nWebhook('/appointment-status', { id: appointmentId, status: 'modification_requested', notes })
}
