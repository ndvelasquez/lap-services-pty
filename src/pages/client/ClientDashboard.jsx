import { Link } from 'react-router-dom'
import { Calendar, FileText, Bell, ChevronRight, Star, Clock, MapPin } from 'lucide-react'
import './ClientDashboard.css'

const appointments = [
  { id: 1, service: 'Limpieza de Apartamento', date: 'Vie 27 Mar, 10:00 AM', location: 'Av. Principal #42, Apto 7B', status: 'confirmed' },
  { id: 2, service: 'Lavado de Aire Acondicionado', date: 'Lun 30 Mar, 02:00 PM', location: 'Av. Principal #42, Apto 7B', status: 'pending' },
  { id: 3, service: 'Limpieza de Muebles', date: 'Lun 16 Mar, 09:00 AM', location: 'Av. Principal #42, Apto 7B', status: 'completed' },
]

const quotations = [
  { id: 'COT-001', service: 'Limpieza de Apartamento', date: '25 Mar 2026', amount: '$120.00', status: 'pending' },
  { id: 'COT-002', service: 'Lavado de AC + Muebles', date: '18 Mar 2026', amount: '$185.00', status: 'accepted' },
  { id: 'COT-003', service: 'Limpieza de Oficina', date: '10 Mar 2026', amount: '$250.00', status: 'rejected' },
]

const notifications = [
  { icon: '🔔', text: 'Tu cita del 27 de Marzo ha sido confirmada', time: 'hace 2 horas' },
  { icon: '📋', text: 'Nueva cotización recibida: COT-001', time: 'hace 1 día' },
  { icon: '✅', text: 'Servicio completado. ¡Califícanos!', time: 'hace 5 días' },
]

const statusLabels = { confirmed: 'Confirmada', pending: 'Pendiente', completed: 'Completada', accepted: 'Aceptada', rejected: 'Rechazada', cancelled: 'Cancelada' }
const statusClass = { confirmed: 'confirmed', pending: 'pending', completed: 'completed', accepted: 'confirmed', rejected: 'cancelled', cancelled: 'cancelled' }

export default function ClientDashboard() {
  return (
    <div className="client-dash" style={{ paddingTop: '100px' }}>
      <div className="container">
        <div className="client-dash__welcome">
          <div>
            <h1>Bienvenido/a</h1>
            <p>Gestiona tus citas y cotizaciones desde aquí</p>
          </div>
          <div className="client-dash__actions">
            <Link to="/agendar" className="btn btn--primary">Nueva Cita</Link>
          </div>
        </div>

        <h2 className="client-dash__section-title">
          <Calendar size={20} /> Próximas Citas
        </h2>
        <div className="apt-grid">
          {appointments.map(apt => (
            <div key={apt.id} className="apt-card card">
              <div className={`badge badge--${statusClass[apt.status]}`}>
                {statusLabels[apt.status]}
              </div>
              <h3>{apt.service}</h3>
              <div className="apt-card__info">
                <span><Clock size={14} /> {apt.date}</span>
                <span><MapPin size={14} /> {apt.location}</span>
              </div>
              <Link to={`/mi-panel/citas/${apt.id}`} className="btn btn--secondary btn--sm">
                {apt.status === 'completed' ? 'Calificar' : 'Ver Detalles'} <ChevronRight size={14} />
              </Link>
            </div>
          ))}
        </div>

        <h2 className="client-dash__section-title">
          <FileText size={20} /> Cotizaciones Recientes
        </h2>
        <div className="quot-table card">
          <table>
            <thead>
              <tr>
                <th>Nº</th>
                <th>Servicio</th>
                <th>Fecha</th>
                <th>Monto</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {quotations.map(q => (
                <tr key={q.id}>
                  <td className="quot-id">{q.id}</td>
                  <td>{q.service}</td>
                  <td>{q.date}</td>
                  <td className="quot-amount">{q.amount}</td>
                  <td><span className={`badge badge--${statusClass[q.status]}`}>{statusLabels[q.status]}</span></td>
                  <td><Link to={`/mi-panel/cotizaciones/${q.id}`} className="btn btn--secondary btn--sm">Ver</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="client-dash__section-title">
          <Bell size={20} /> Notificaciones
        </h2>
        <div className="notif-list">
          {notifications.map((n, i) => (
            <div key={i} className="notif-item card">
              <span className="notif-icon">{n.icon}</span>
              <div className="notif-body">
                <p>{n.text}</p>
                <span className="notif-time">{n.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
