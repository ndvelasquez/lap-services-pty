import { createClient } from '@supabase/supabase-js'

// Las credenciales se leen exclusivamente de variables de entorno (.env.local).
// Settings -> API en el dashboard de Supabase. Ver SECURITY.md.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. ' +
    'Definelas en .env.local (ver SECURITY.md).'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
