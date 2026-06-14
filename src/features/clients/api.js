// Módulo de dominio: GESTIÓN DE CLIENTES (lectura desde profiles).
import { supabase } from '../../lib/supabase'

/** Todos los perfiles que no son admin (vista de clientes). */
export async function getAllClients() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .neq('role', 'admin')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

/** Perfiles con rol explícito 'client'. */
export async function getClients() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'client')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

/** Cuenta de clientes (perfiles no-admin). */
export async function getClientCount() {
  const { count, error } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .neq('role', 'admin')
  if (error) throw error
  return count || 0
}
