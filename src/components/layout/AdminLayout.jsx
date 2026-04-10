import { useState, useEffect } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Calendar, ClipboardList, DollarSign,
  Wrench, Users, Settings, LogOut, Menu, X, Wallet
} from 'lucide-react'
import './AdminLayout.css'

const navItems = [
  { path: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { path: '/admin/calendario', icon: Calendar, label: 'Calendario' },
  { path: '/admin/citas', icon: ClipboardList, label: 'Citas' },
  { path: '/admin/cotizaciones', icon: DollarSign, label: 'Cotizaciones' },
  { path: '/admin/abonos', icon: Wallet, label: 'Abonos' },
  { path: '/admin/servicios', icon: Wrench, label: 'Servicios' },
  { path: '/admin/clientes', icon: Users, label: 'Clientes' },
]

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  // Close mobile sidebar on route change
  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  const isActive = (item) => {
    if (item.exact) return location.pathname === item.path
    return location.pathname.startsWith(item.path)
  }

  return (
    <div className="admin-layout">
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div className="admin-sidebar__backdrop" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`admin-sidebar ${collapsed ? 'admin-sidebar--collapsed' : ''} ${mobileOpen ? 'admin-sidebar--open' : ''}`}>
        <div className="admin-sidebar__header">
          <Link to="/admin" className="admin-sidebar__logo">
            <span className="admin-sidebar__logo-icon">LAP</span>
            {!collapsed && (
              <span className="admin-sidebar__logo-text">
                Service<br />Panamá
              </span>
            )}
          </Link>
          <button className="admin-sidebar__toggle" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <Menu size={18} /> : <X size={18} />}
          </button>
        </div>

        <nav className="admin-sidebar__nav">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`admin-sidebar__link ${isActive(item) ? 'admin-sidebar__link--active' : ''}`}
              title={item.label}
            >
              <item.icon size={20} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="admin-sidebar__footer">
          <Link to="/admin/configuracion" className="admin-sidebar__link" title="Configuración">
            <Settings size={20} />
            {!collapsed && <span>Configuración</span>}
          </Link>
          <Link to="/" className="admin-sidebar__link" title="Salir">
            <LogOut size={20} />
            {!collapsed && <span>Salir</span>}
          </Link>
        </div>
      </aside>

      <main className="admin-main">
        <div className="admin-mobile-header">
          <button className="admin-mobile-toggle" onClick={() => setMobileOpen(true)} aria-label="Abrir menú">
            <Menu size={22} />
          </button>
          <span className="admin-mobile-brand">LAP Admin</span>
        </div>
        <Outlet />
      </main>
    </div>
  )
}
