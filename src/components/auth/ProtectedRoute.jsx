import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { getCurrentUser } from '../../services/api'
import FullscreenLoader from '../FullscreenLoader'

/**
 * ProtectedRoute — guard de rutas reutilizable.
 *
 * Verifica la sesión vía getCurrentUser() y, opcionalmente, el rol del perfil.
 * Se usa como layout wrapper (renderiza <Outlet />) en App.jsx.
 *
 * @param {Object} props
 * @param {string} [props.requireRole] - Rol requerido (ej. 'admin'). Si se omite, solo exige sesión.
 */
export default function ProtectedRoute({ requireRole }) {
  const location = useLocation()
  const [status, setStatus] = useState('checking') // 'checking' | 'allowed' | 'no-session' | 'wrong-role'

  useEffect(() => {
    let active = true

    async function check() {
      setStatus('checking')
      try {
        const user = await getCurrentUser()
        if (!active) return

        if (!user) {
          setStatus('no-session')
          return
        }
        if (requireRole && user.role !== requireRole) {
          setStatus('wrong-role')
          return
        }
        setStatus('allowed')
      } catch (err) {
        if (!active) return
        console.error('Auth check failed:', err)
        setStatus('no-session')
      }
    }

    check()
    return () => { active = false }
  }, [requireRole, location.pathname])

  if (status === 'checking') {
    return <FullscreenLoader visible message="Verificando acceso..." />
  }

  if (status === 'no-session') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (status === 'wrong-role') {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
