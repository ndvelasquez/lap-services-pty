import { Link } from 'react-router-dom'
import { MessageCircle, Mail, MapPin, Instagram, Facebook, Clock } from 'lucide-react'
import './Footer.css'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__grid">
          <div className="footer__brand">
            <div className="footer__logo">
              <span className="footer__logo-icon">LAP</span>
              <span className="footer__logo-text">
                Service <span>Panamá</span>
              </span>
            </div>
            <p className="footer__tagline">Comprometidos con la excelencia!</p>
            <p className="footer__desc">
              Empresa multi-servicios con más de 12 años de experiencia en limpieza,
              mantenimiento y reparaciones en Panamá.
            </p>
            <div className="footer__social">
              <a href="https://www.instagram.com/lapservicepty/" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                <Instagram size={20} />
              </a>
              <a href="https://www.facebook.com/Lapservicepty" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                <Facebook size={20} />
              </a>
            </div>
          </div>

          <div className="footer__col">
            <h4>Servicios</h4>
            <ul>
              <li><Link to="/servicios">Limpieza de Espacios</Link></li>
              <li><Link to="/servicios">Limpieza de Muebles</Link></li>
              <li><Link to="/servicios">Aire Acondicionado</Link></li>
              <li><Link to="/servicios">Auto Detailing</Link></li>
              <li><Link to="/servicios">Reparaciones y Pintura</Link></li>
              <li><Link to="/servicios">Productos de Limpieza</Link></li>
            </ul>
          </div>

          <div className="footer__col">
            <h4>Acceso Rápido</h4>
            <ul>
              <li><Link to="/agendar">Agendar Cita</Link></li>
              <li><Link to="/login">Iniciar Sesión</Link></li>
              <li><Link to="/registro">Crear Cuenta</Link></li>
              <li><Link to="/mi-panel">Mi Panel</Link></li>
            </ul>
          </div>

          <div className="footer__col">
            <h4>Contacto</h4>
            <ul className="footer__contact">
              <li>
                <MessageCircle size={16} />
                <a href="https://wa.me/50769841395" target="_blank" rel="noopener noreferrer">Chatea por WhatsApp</a>
              </li>
              <li>
                <Mail size={16} />
                <a href="mailto:info@lapservicepty.com">info@lapservicepty.com</a>
              </li>
              <li>
                <MapPin size={16} />
                <span>PH Sky Level, Ciudad de Panamá</span>
              </li>
              <li>
                <Clock size={16} />
                <span>Lunes a Sábado: 7:00 AM - 6:00 PM</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer__bottom">
          <p>© {new Date().getFullYear()} LAP Services PTY. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  )
}
