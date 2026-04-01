import { useState, useEffect } from 'react'
import { Save, Lock, Mail, Bell, Shield } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { getCurrentUser } from '../../services/api'
import { alertWarning, alertSuccess, toastError } from '../../lib/notifications'

export default function AdminSettings() {
  const [user, setUser] = useState(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function loadUser() {
      const currentUser = await getCurrentUser()
      setUser(currentUser)
    }
    loadUser()
  }, [])

  const handleUpdatePassword = async (e) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      return alertWarning('Contraseñas no coinciden', 'Ambos campos de contraseña deben ser iguales.')
    }
    if (password.length < 6) {
      return alertWarning('Contraseña muy corta', 'La contraseña debe tener al menos 6 caracteres.')
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      alertSuccess('Contraseña Actualizada', 'Tu contraseña ha sido cambiada exitosamente.')
      setPassword('')
      setConfirmPassword('')
    } catch (err) {
      console.error('Error actualizando contraseña', err)
      toastError('Hubo un error al actualizar la contraseña')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: 'var(--space-8)', maxWidth: '800px' }}>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>Configuración del Sistema</h1>
        <p style={{ color: 'var(--dark-400)' }}>Administra tu cuenta y preferencias de la plataforma</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        
        {/* Security Section */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', borderBottom: '1px solid var(--light-300)', paddingBottom: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
            <Shield color="var(--primary)" />
            <h2 style={{ fontSize: '1.2rem' }}>Seguridad de la Cuenta</h2>
          </div>
          
          <div style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 300px' }}>
              <label style={{ display: 'block', marginBottom: 'var(--space-2)', color: 'var(--dark-400)' }}>Usuario / Email</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-3)', background: 'var(--light-200)', borderRadius: 'var(--radius-md)' }}>
                <Mail size={16} color="var(--dark-400)" />
                <span style={{ color: 'var(--dark-600)', fontWeight: 500 }}>{user?.email || 'Cargando...'}</span>
              </div>
            </div>

            <form onSubmit={handleUpdatePassword} style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <label>
                Nueva Contraseña
                <input 
                  type="password" 
                  className="form-input" 
                  style={{ width: '100%', marginTop: '4px' }} 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                />
              </label>
              <label>
                Confirmar Contraseña
                <input 
                  type="password" 
                  className="form-input" 
                  style={{ width: '100%', marginTop: '4px' }} 
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repite la contraseña"
                />
              </label>
              <button 
                type="submit" 
                className="btn btn--primary" 
                style={{ alignSelf: 'flex-start' }}
                disabled={!password || loading}
              >
                {loading ? 'Actualizando...' : 'Cambiar Contraseña'}
              </button>
            </form>
          </div>
        </div>

        {/* Notifications Setting (Mock) */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', borderBottom: '1px solid var(--light-300)', paddingBottom: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
            <Bell color="var(--primary)" />
            <h2 style={{ fontSize: '1.2rem' }}>Notificaciones</h2>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
               <input type="checkbox" defaultChecked />
               <div>
                 <strong>Nuevas citas pendientes</strong>
                 <p style={{ fontSize: '0.85rem', color: 'var(--dark-400)' }}>Recibir correos cuando hay una nueva solicitud en el agendador.</p>
               </div>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
               <input type="checkbox" defaultChecked />
               <div>
                 <strong>Actualizaciones de pago</strong>
                 <p style={{ fontSize: '0.85rem', color: 'var(--dark-400)' }}>Recibir alertas cuando un cliente carga un comprobante de pago.</p>
               </div>
            </label>
            <button className="btn btn--secondary" style={{ alignSelf: 'flex-start', marginTop: 'var(--space-2)' }}>
              Guardar Preferencias
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
