// Módulo de dominio: CATÁLOGO DE SERVICIOS.
import { supabase } from '../../lib/supabase'

/** Servicios activos, ordenados por categoría (fuente única del catálogo). */
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

/** Todos los servicios (incluye inactivos), ordenados por nombre — vista admin. */
export async function getAllServices() {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .order('name')
  if (error) throw error
  return data || []
}

export async function updateService(id, updates) {
  const { error } = await supabase
    .from('services')
    .update(updates)
    .eq('id', id)
  if (error) throw error
}

/** Alterna el flag active de un servicio. */
export async function toggleServiceActive(service) {
  const { error } = await supabase
    .from('services')
    .update({ active: !service.active })
    .eq('id', service.id)
  if (error) throw error
}
