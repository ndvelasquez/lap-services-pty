import { supabase } from '../lib/supabase'

// ============================================================
// n8n WEBHOOKS
// Integración asíncrona para correos, PDFs y WhatsApp
// ============================================================
const N8N_BASE_URL = import.meta.env.VITE_N8N_BASE_URL || 'http://localhost:5678/webhook'

async function triggerN8nWebhook(endpoint, data) {
  try {
    const res = await fetch(`${N8N_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return res.ok
  } catch (error) {
    console.warn(`n8n webhook failed at ${endpoint}`, error)
    return false
  }
}

// ============================================================
// AUTH - Supabase Authentication
// ============================================================

export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return { user: data.user, session: data.session }
}

export async function register(userData) {
  // 1. Crear en auth.users
  const { data, error } = await supabase.auth.signUp({
    email: userData.email,
    password: userData.password,
    options: {
      data: {
        full_name: userData.name,
        phone: userData.phone
      }
    }
  })
  if (error) throw error

  // Nota: El trigger creado en SQL se encargará de crear el perfil automáticamente.
  // Sin embargo, podemos hacer un UPDATE para rellenar la dirección si hace falta:
  if (data.user && userData.address) {
    await supabase.from('profiles').update({ address: userData.address }).eq('id', data.user.id)
  }

  // Desencadenar un webhook n8n de "Bienvenida" si lo deseas
  triggerN8nWebhook('/welcome-email', { email: userData.email, name: userData.name })

  return { user: data.user, session: data.session }
}

export async function logout() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentUser() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  // Fetch full profile info
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()

  return profile || session.user
}

// ============================================================
// APPOINTMENTS - Citas en Supabase
// ============================================================

export async function createAppointment(appData) {
  const { clientId, date, time, location, notes, services, customDetails, images } = appData
  
  // 1. Insertar Cita cabecera
  const { data: appointment, error: aptError } = await supabase
    .from('appointments')
    .insert([{
      client_id: clientId,
      appointment_date: date,
      start_time: time,
      end_time: `${parseInt(time.split(':')[0]) + 2}:00`, // Asume 2h por defecto, puedes calcularlo
      location_address: location,
      notes: notes,
      status: 'pending'
    }])
    .select()
    .single()

  if (aptError) throw aptError

  // 2. Insertar los servicios dentro de esa cita
  const servicesToInsert = services.map(sId => ({
    appointment_id: appointment.id,
    service_id: sId,
    custom_details: customDetails,
    images: images || []
  }))

  const { error: srvError } = await supabase
    .from('appointment_services')
    .insert(servicesToInsert)

  if (srvError) throw srvError

  // 3. Informar a n8n para que envíe correo de "Cita Recibida"
  triggerN8nWebhook('/new-appointment', { appointment, services })

  return appointment
}

export async function getClientAppointments(clientId) {
  const { data, error } = await supabase
    .from('appointments')
    .select('*, appointment_services(service_id, services(name))')
    .eq('client_id', clientId)
    .order('appointment_date', { ascending: false })
  if (error) throw error
  return data
}

export async function getAllAppointments() {
  const { data, error } = await supabase
    .from('appointments')
    .select('*, profiles(name), appointment_services(services(name))')
    .order('appointment_date', { ascending: false })
  if (error) throw error
  return data
}

export async function updateAppointment(id, updates) {
  const { data, error } = await supabase
    .from('appointments')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  
  // Trigger n8n if status changed
  if (updates.status) {
    triggerN8nWebhook('/appointment-status', { id, status: updates.status })
  }
  return data
}

// ============================================================
// QUOTATIONS - Cotizaciones en Supabase
// ============================================================

export async function createQuotation(data) {
  const { appointmentId, clientId, items, conditions, taxRate } = data
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
  const tax = subtotal * taxRate
  const total = subtotal + tax

  // 1. Insert Quote
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

  // 2. Insert line items
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
    .select('id, subtotal, total, status, created_at, appointments(appointment_date)')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// Sends quotation via external logic (n8n Webhook)
export async function sendQuotation(quoteId) {
  // Pasa del estado 'draft' a 'sent'
  await supabase.from('quotations').update({ status: 'sent' }).eq('id', quoteId)
  
  // N8N se encargará de generar el PDF y enviarlo por email
  return await triggerN8nWebhook('/send-quotation', { quoteId })
}

// ============================================================
// SERVICES (CATALOG) - Catálogo en Supabase
// ============================================================

export async function getServices() {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('active', true)
    .order('category', { ascending: true })
  if (error) throw error
  return data
}

export async function createService(serviceData) {
  const { data, error } = await supabase
    .from('services')
    .insert([serviceData])
    .select()
  if (error) throw error
  return data
}

// ============================================================
// CLIENTS - Lectura desde profiles
// ============================================================

export async function getClients() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'client')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// ============================================================
// STORAGE - Subir Imágenes a Supabase
// ============================================================

export async function uploadImages(files) {
  const urls = []
  
  for (const file of files) {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random()}.${fileExt}`
    const filePath = `uploads/${fileName}`

    const { error: uploadError, data } = await supabase.storage
      .from('lap_images')
      .upload(filePath, file)

    if (uploadError) {
      console.error('Upload Error:', uploadError.message)
      continue
    }
    
    // Obtener la URL pública (Asegúrate de que el bucket sea Público en Supabase)
    const { data: publicData } = supabase.storage
      .from('lap_images')
      .getPublicUrl(filePath)
      
    urls.push(publicData.publicUrl)
  }
  
  return { urls }
}

// ============================================================
// QUOTATION LIFECYCLE — Aceptar / Rechazar / Modificar
// ============================================================

export async function acceptQuotation(quoteId, appointmentId) {
  // 1. Actualizar estado de la cotización
  await supabase.from('quotations').update({ status: 'accepted' }).eq('id', quoteId)
  // 2. Actualizar cita a "quotation_sent" (el admin la confirmará cuando revise el pago)
  await supabase.from('appointments').update({ status: 'quotation_sent' }).eq('id', appointmentId)
  // 3. Notificar al admin
  triggerN8nWebhook('/appointment-status', { id: appointmentId, status: 'quotation_sent' })
}

export async function rejectQuotation(quoteId, appointmentId) {
  // 1. Rechazar cotización
  await supabase.from('quotations').update({ status: 'rejected' }).eq('id', quoteId)
  // 2. Cancelar cita → libera el slot
  await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', appointmentId)
  // 3. Notificar
  triggerN8nWebhook('/appointment-status', { id: appointmentId, status: 'cancelled' })
}

export async function requestModification(appointmentId, notes) {
  // 1. Cambiar estado a modification_requested
  await supabase.from('appointments').update({ status: 'modification_requested', notes }).eq('id', appointmentId)
  // 2. Notificar al admin para que cree nueva cotización
  triggerN8nWebhook('/appointment-status', { id: appointmentId, status: 'modification_requested', notes })
}

// ============================================================
// PAYMENT PROOF — Subir comprobante de pago
// ============================================================

export async function uploadPaymentProof(appointmentId, file) {
  // 1. Subir archivo a Supabase Storage
  const fileExt = file.name.split('.').pop()
  const fileName = `payment_${appointmentId}_${Date.now()}.${fileExt}`
  const filePath = `payments/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('lap_images')
    .upload(filePath, file)

  if (uploadError) throw uploadError

  // 2. Obtener URL pública
  const { data: publicData } = supabase.storage
    .from('lap_images')
    .getPublicUrl(filePath)

  const paymentUrl = publicData.publicUrl

  // 3. Actualizar cita con la URL y cambiar estado
  await supabase.from('appointments').update({
    payment_proof_url: paymentUrl,
    status: 'payment_uploaded'
  }).eq('id', appointmentId)

  // 4. Notificar al admin
  triggerN8nWebhook('/appointment-status', { id: appointmentId, status: 'payment_uploaded' })

  return paymentUrl
}

// ============================================================
// DISPONIBILIDAD — Verificar slots ocupados (reserva 5 días)
// ============================================================

export async function getAvailableSlots(date) {
  // Los estados pending, confirmed, quotation_sent, payment_uploaded bloquean el slot
  const { data, error } = await supabase
    .from('appointments')
    .select('start_time, end_time')
    .eq('appointment_date', date)
    .in('status', ['pending', 'confirmed', 'quotation_sent', 'payment_uploaded'])
  if (error) throw error
  return data // Array de slots ocupados para ese día
}

export default {
  login, register, logout, getCurrentUser,
  createAppointment, getClientAppointments, getAllAppointments, updateAppointment,
  createQuotation, getClientQuotations, sendQuotation,
  acceptQuotation, rejectQuotation, requestModification,
  uploadPaymentProof, getAvailableSlots,
  getServices, createService, getClients, uploadImages
}
