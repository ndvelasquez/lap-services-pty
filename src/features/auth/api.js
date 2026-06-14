// Módulo de dominio: AUTENTICACIÓN y perfil de usuario.
import { supabase } from '../../lib/supabase'
import { triggerN8nWebhook } from '../../shared/n8n'

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
  if (data.user && (!data.user.identities || data.user.identities.length === 0)) {
    throw new Error('Este correo electrónico ya se encuentra registrado. Por favor, inicia sesión o utiliza otro correo.')
  }

  // El trigger SQL crea el perfil automáticamente. Como la confirmación de email
  // está activa, el registro devuelve sesión nula y la RLS bloquea el UPDATE de
  // abajo (la dirección ya se empujó al raw_user_meta_data arriba para el trigger).
  if (data.user && userData.address) {
    const { error: updErr } = await supabase.from('profiles').update({ address: userData.address }).eq('id', data.user.id)
    if (updErr) console.log('RLS Update failed as expected for unauth signup:', updErr.message)
  }

  // Webhook de bienvenida
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

export async function savePushSubscription(userId, subscription) {
  const { error } = await supabase
    .from('profiles')
    .update({ push_subscription: subscription })
    .eq('id', userId)
  if (error) throw error
}
