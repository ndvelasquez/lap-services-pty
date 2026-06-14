// Módulo de dominio: GESTIÓN DE CITAS (appointments).
import { supabase } from '../../lib/supabase'
import { triggerN8nWebhook } from '../../shared/n8n'

export async function createAppointment(appData) {
  const { clientId, date, time, location, notes, services, customDetails, images } = appData

  // 1. Insertar cabecera de la cita
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

  // 2. Insertar los servicios de la cita
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

  // Perfil del cliente para el webhook
  const { data: profile } = await supabase
    .from('profiles')
    .select('name, email, phone')
    .eq('id', clientId)
    .single()

  const clientName = profile?.name || 'Cliente'
  const clientEmail = profile?.email || ''
  const clientPhone = profile?.phone || ''

  // Nombres de servicios para el email
  const { data: servicesData } = await supabase
    .from('services')
    .select('name')
    .in('id', services)
  const serviceNames = servicesData?.map(s => s.name) || []

  // 3. Notificar vía n8n
  try {
    await triggerN8nWebhook('/new-appointment', {
      appointment,
      clientName,
      clientEmail,
      clientPhone,
      serviceNames
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

export async function updateAppointment(id, updates) {
  const { data, error } = await supabase
    .from('appointments')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error

  // Disparar n8n si cambió el estado
  if (updates.status) {
    triggerN8nWebhook('/appointment-status', { id, status: updates.status })
    if (updates.status === 'confirmed') {
      triggerN8nWebhook('/calendar-sync', { id, status: updates.status })
    }
  }
  return data
}

export async function getAvailableSlots(date) {
  // Los estados pending, confirmed, quotation_sent, payment_uploaded bloquean el slot
  const { data, error } = await supabase
    .from('appointments')
    .select('start_time, end_time')
    .eq('appointment_date', date)
    .in('status', ['pending', 'confirmed', 'quotation_sent', 'payment_uploaded'])
  if (error) throw error
  return data
}
