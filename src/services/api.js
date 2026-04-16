import { supabase } from '../lib/supabase'
export { supabase }

// ============================================================
// n8n WEBHOOKS
// Integración asíncrona para correos, PDFs y WhatsApp
// ============================================================
const N8N_BASE_URL = import.meta.env.VITE_N8N_BASE_URL || 'http://localhost:5678/webhook'

async function triggerN8nWebhook(endpoint, data, method = 'POST') {
  try {
    // We use the Supabase Edge Function as a proxy to n8n
    // This solves CORS issues and allows us to keep the n8n URL private
    const { data: res, error } = await supabase.functions.invoke('n8n-proxy', {
      body: { 
        endpoint,
        method,
        params: data 
      }
    })
    
    if (error) {
      console.error(`Edge Function proxy error for ${endpoint}:`, error)
      throw new Error(`Error de red al conectar con el servidor de automatización: ${error.message}`)
    }

    // The proxy returns the n8n response. If n8n returns an error field, we throw.
    if (res && res.error) {
       console.error(`n8n error for ${endpoint}:`, res.error)
       throw new Error(`Error en el servidor de automatización: ${res.error}`)
    }
    
    return res
  } catch (error) {
    console.error(`n8n proxy failed at ${endpoint}:`, error)
    throw error
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
        phone: userData.phone,
        address: userData.address
      }
    }
  })
  if (error) throw error

  // 2. Detectar email duplicado.
  // Cuando la confirmación de email está habilitada, Supabase NO devuelve error
  // si el email ya existe. En su lugar, devuelve un usuario "obfuscado" con
  // identities vacío y sin sesión. Esto previene ataques de enumeración de emails.
  // Ref: https://supabase.com/docs/guides/auth/auth-identity-linking#can-you-sign-up-with-email-if-already-using-oauth
  if (data.user && (!data.user.identities || data.user.identities.length === 0)) {
    throw new Error('Este correo electrónico ya se encuentra registrado. Por favor, inicia sesión o utiliza otro correo.')
  }

  // Nota: El trigger creado en SQL se encargará de crear el perfil automáticamente.
  // Como la confirmación de email está encendida en Supabase, el registro devuelve una sesión nula.
  // Por ende, la política RLS va a bloquear cualquier UPDATE a la tabla perfiles desde aquí.
  // La dirección ha sido empujada al raw_user_meta_data arriba para el trigger.
  if (data.user && userData.address) {
    const { error: updErr } = await supabase.from('profiles').update({ address: userData.address }).eq('id', data.user.id)
    if (updErr) console.log('RLS Update failed as expected for unauth signup:', updErr.message)
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

  try {
    // Fetch full profile info
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()

    return profile || session.user
  } catch (err) {
    console.warn('Profile fetch error normally ignored:', err)
    return session.user
  }
}

// ============================================================
// APPOINTMENTS - Citas en Supabase
// ============================================================

export async function createAppointment(appData) {
  const { clientId, date, time, location, notes, services, customDetails, images } = appData
  
  // 1. Insertar Cita cabecera
  const [hours, minutes] = time.split(':')
  const endHours = parseInt(hours, 10) + 2
  const formattedEndHours = endHours >= 24 ? '23' : String(endHours).padStart(2, '0') // Evita horas > 23
  const endTime = `${formattedEndHours}:${minutes}:00`

  const { data: appointment, error: aptError } = await supabase
    .from('appointments')
    .insert([{
      client_id: clientId,
      appointment_date: date,
      start_time: time,
      end_time: endTime,
      location_address: location,
      notes: notes,
      status: 'pending'
    }])
    .select()
    .single()

  if (aptError) {
    console.error('Error creating appointment header:', aptError)
    throw aptError
  }

  // 2. Insertar los servicios dentro de esa cita
  const servicesToInsert = services.map(sId => ({
    appointment_id: appointment.id,
    service_id: sId,
    custom_details: customDetails,
    images: Array.isArray(images) ? images : []
  }))

  const { error: srvError } = await supabase
    .from('appointment_services')
    .insert(servicesToInsert)

  if (srvError) {
    console.error('Error creating appointment services:', srvError)
    throw srvError
  }

  // Fetch client profile for the webhook
  const { data: profile } = await supabase
    .from('profiles')
    .select('name, email, phone')
    .eq('id', clientId)
    .single()

  const clientName = profile?.name || 'Cliente'
  const clientEmail = profile?.email || ''
  const clientPhone = profile?.phone || ''

  // Fetch service names for the email
  const { data: servicesData } = await supabase
    .from('services')
    .select('name')
    .in('id', services)
  const serviceNames = servicesData?.map(s => s.name) || []

  // 3. Notificar vía n8n (o cualquier otro sistema externo)
  try {
    await triggerN8nWebhook('/new-appointment', { 
      appointment, 
      client: { name: clientName, email: clientEmail, phone: clientPhone },
      services: servicesToInsert 
    })
  } catch (error) {
    console.warn('Webhook notification failed, but appointment was created:', error)
  }

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
    .select('*, profiles(name, phone, email, address), appointment_services(services(name), custom_details, images)')
    .order('appointment_date', { ascending: false })
  if (error) throw error
  return data
}

export async function getAppointment(id) {
  const { data, error } = await supabase
    .from('appointments')
    .select('*, profiles(name, phone, email, address), appointment_services(services(name), custom_details, images)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function getAllClients() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .neq('role', 'admin')
    .order('created_at', { ascending: false })
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
    if (updates.status === 'confirmed') {
      triggerN8nWebhook('/calendar-sync', { id, status: updates.status })
    }
  }
  return data
}

// ============================================================
// QUOTATIONS - Cotizaciones en Supabase
// ============================================================

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
  const result = await triggerN8nWebhook('/gen-quotation-pdf-v5', { 
    quoteId: quotationId, 
    regenerate: false 
  }, 'POST')
  return result
}

export async function regenerateQuotationPdf(quotationId) {
  const result = await triggerN8nWebhook('/gen-quotation-pdf-v5', { 
    quoteId: quotationId, 
    regenerate: true 
  }, 'POST')
  return result
}

export async function createQuotation(data) {
  const { appointmentId, clientId, items, conditions, taxRate } = data
  const subtotal = Number(items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0).toFixed(2))
  const tax = Number((subtotal * taxRate).toFixed(2))
  const total = Number((subtotal + tax).toFixed(2))

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

// Sends quotation via external logic (n8n Webhook)
export async function sendQuotation(quoteId) {
  const { data: quote } = await supabase
    .from('quotations')
    .select('pdf_url, status, appointment_id')
    .eq('id', quoteId)
    .single()

  if (!quote) throw new Error('Quotation not found')

  if (!quote.pdf_url) {
    await triggerN8nWebhook('/gen-quotation-pdf-v5', { 
      quoteId: quoteId, 
      regenerate: false 
    }, 'POST')
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
  
  if (!files || files.length === 0) return { urls }

  for (const file of files) {
    // Generate unique name: timestamp + random string + original extension
    const fileExt = file.name ? file.name.split('.').pop() : 'jpg'
    const randomStr = Math.random().toString(36).substring(7)
    const fileName = `${Date.now()}-${randomStr}.${fileExt}`
    const filePath = `uploads/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('lap_images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Upload Error:', uploadError.message)
      throw new Error(`Error subiendo la imagen ${file.name}: ${uploadError.message}`)
    }
    
    // Obtener la URL pública (Asegúrate de que el bucket sea Público en Supabase)
    const { data: publicData } = supabase.storage
      .from('lap_images')
      .getPublicUrl(filePath)
      
    if (publicData?.publicUrl) {
      urls.push(publicData.publicUrl)
    }
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
// PAYMENT PROOF — Subir comprobante de pago (50% abono)
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

  // 4. Buscar la cotización vinculada para calcular el 50% del abono
  const { data: quote } = await supabase
    .from('quotations')
    .select('id, total')
    .eq('appointment_id', appointmentId)
    .eq('status', 'accepted')
    .single()

  if (quote) {
    const depositAmount = Number((quote.total * 0.5).toFixed(2))
    // 5. Registrar el abono (50%) en la tabla de pagos
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

  // 6. Notificar al admin
  triggerN8nWebhook('/appointment-status', { id: appointmentId, status: 'payment_uploaded' })

  return paymentUrl
}

// ============================================================
// PAYMENTS — Gestión de abonos y pagos
// ============================================================

/** Obtiene todos los pagos con datos de cita, cotización y cliente (vista admin) */
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

/** Verifica un abono (admin confirma que recibió el pago) y confirma la cita */
export async function verifyDeposit(paymentId) {
  // 1. Verificar el pago
  const { data: payment, error } = await supabase
    .from('payments')
    .update({ status: 'verified', verified_at: new Date().toISOString() })
    .eq('id', paymentId)
    .select('appointment_id')
    .single()
  if (error) throw error

  // 2. Actualizar la cita a 'confirmed' si aún está en payment_uploaded
  if (payment?.appointment_id) {
    await supabase
      .from('appointments')
      .update({ status: 'confirmed' })
      .eq('id', payment.appointment_id)
      .eq('status', 'payment_uploaded')
  }
}

/** Registra el pago final (50% restante) al completar el servicio. Se asume recibido. */
export async function recordFinalPayment(appointmentId) {
  // Buscar la cotización y el depósito existente
  const { data: quote } = await supabase
    .from('quotations')
    .select('id, total')
    .eq('appointment_id', appointmentId)
    .single()

  if (!quote) return

  const finalAmount = Number((quote.total * 0.5).toFixed(2))

  // Verificar si ya existe el pago final
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

/** Estadísticas de ingresos para el dashboard */
export async function getIncomeStats() {
  // Ingresos confirmados: 100% de citas completadas
  const { data: completedQuotes } = await supabase
    .from('quotations')
    .select('total, appointments!inner(status)')
    .eq('appointments.status', 'completed')
  const confirmedIncome = completedQuotes?.reduce((sum, q) => sum + (q.total || 0), 0) || 0

  // Abonos verificados en espera (citas confirmadas o con pago subido, no completadas)
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

// Eliminar cotización (solo si está en estado draft/sent/pendiente)
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

export async function savePushSubscription(userId, subscription) {
  const { error } = await supabase
    .from('profiles')
    .update({ push_subscription: subscription })
    .eq('id', userId)
  if (error) throw error
}

export default {
  login, register, logout, getCurrentUser,
  createAppointment, getAppointment, getClientAppointments, getAllAppointments, updateAppointment,
  createQuotation, getClientQuotations, getQuotationById, getQuotationByAppointmentId, updateQuotation, deleteQuotation,
  generateQuotationPdf, regenerateQuotationPdf, sendQuotation,
  acceptQuotation, rejectQuotation, requestModification,
  uploadPaymentProof, getAvailableSlots,
  getServices, createService, getClients, uploadImages,
  savePushSubscription,
  getAdminPayments, verifyDeposit, recordFinalPayment, getIncomeStats
}
