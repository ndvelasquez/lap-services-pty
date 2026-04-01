import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, LogOut, User } from 'lucide-react'
import { getCurrentUser, logout } from '../../services/api'
import './Navbar.css'

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [user, setUser] = useState(null)
  const location = useLocation()
  const navigate = useNavigate()
  const isHome = location.pathname === '/'

  useEffect(() => {
    getCurrentUser().then(setUser).catch(console.error)
  }, [location.pathname]) // Refresh on navigation

  const handleLogout = async () => {
    await logout()
    setUser(null)
    navigate('/login')
  }

  return (
    <nav className={`navbar ${!isHome ? 'navbar--solid' : ''}`}>
      <div className="navbar__inner container">
        <Link to="/" className="navbar__logo">
          <span className="navbar__logo-icon">LAP</span>
          <span className="navbar__logo-text">
            Service <span>Panamá</span>
          </span>
        </Link>

        <div className={`navbar__links ${mobileOpen ? 'navbar__links--open' : ''}`}>
          <Link to="/" className="navbar__link" onClick={() => setMobileOpen(false)}>Inicio</Link>
          <Link to="/servicios" className="navbar__link" onClick={() => setMobileOpen(false)}>Servicios</Link>
          <Link to="/agendar" className="navbar__link" onClick={() => setMobileOpen(false)}>Agendar Cita</Link>
          
          {user ? (
            <>
              <Link to="/mi-panel" className="navbar__link" onClick={() => setMobileOpen(false)}>Mi Panel</Link>
              <button onClick={() => { handleLogout(); setMobileOpen(false) }} className="btn btn--outline btn--sm navbar__cta" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <LogOut size={16} /> Salir
              </button>
            </>
          ) : (
            <Link to="/login" className="btn btn--primary btn--sm navbar__cta" onClick={() => setMobileOpen(false)}>
              Iniciar Sesión
            </Link>
          )}
        </div>

        <button
          className="navbar__toggle"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
    </nav>
  )
}
