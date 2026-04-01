import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Calendar, FileText, Bell, ChevronRight, Clock, MapPin, PlusCircle } from 'lucide-react'
import { getCurrentUser, getClientAppointments } from '../../services/api'
import './ClientDashboard.css'

const statusLabels = { pending: 'Pendiente', quotation_sent: 'Cotización Enviada', payment_uploaded: 'Pago en Revisión', confirmed: 'Confirmada', completed: 'Completada', cancelled: 'Cancelada', modification_requested: 'Cambio Solicitado' }
const statusClass = { pending: 'pending', quotation_sent: 'pending', payment_uploaded: 'confirmed', confirmed: 'confirmed', completed: 'completed', cancelled: 'cancelled', modification_requested: 'pending' }

export default function ClientDashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const currentUser = await getCurrentUser()
        if (!currentUser) {
          navigate('/login')
          return
        }
        setUser(currentUser)
        
        const apts = await getClientAppointments(currentUser.id)
        
        const formattedApts = apts.map(apt => {
          const serviceNames = apt.appointment_services?.map(as => as.services.name).join(', ') || 'Servicio de Limpieza'
          
          let dateStr = apt.appointment_date
          if (apt.appointment_date) {
            const [y, m, d] = apt.appointment_date.split('-')
            const dateObj = new Date(y, m - 1, d)
            dateStr = dateObj.toLocaleDateString('es-PA', { weekday: 'short', day: 'numeric', month: 'short' }) + `, ${apt.start_time.slice(0,5)}`
          }

          return {
            id: apt.id,
            service: serviceNames,
            date: dateStr,
            location: apt.location_address || 'Tu Domicilio',
            status: apt.status
          }
        })

        setAppointments(formattedApts)
      } catch (err) {
        console.error('Error loading dashboard', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [navigate])

  if (loading) {
    return <div className="client-dash" style={{ paddingTop: '100px', minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><h2>Cargando tu panel...</h2></div>
  }

  return (
    <div className="client-dash" style={{ paddingTop: '100px' }}>
      <div className="container">
        <div className="client-dash__welcome">
          <div>
            <h1>Hola, {user?.name?.split(' ')[0] || 'Cliente'}</h1>
            <p>Gestiona tus citas y servicios desde aquí</p>
          </div>
          <div className="client-dash__actions">
            <Link to="/agendar" className="btn btn--primary"><PlusCircle size={18} style={{marginRight: '8px'}} />Nueva Cita</Link>
          </div>
        </div>

        <h2 className="client-dash__section-title">
          <Calendar size={20} /> Mis Citas
        </h2>

        {appointments.length === 0 ? (
          <div className="empty-state card" style={{ textAlign: 'center', padding: '60px 20px' }}>
            <Calendar size={48} style={{ color: '#ccc', marginBottom: '20px' }} />
            <h3 style={{ marginBottom: '10px' }}>Aún no tienes citas agendadas</h3>
            <p style={{ color: '#666', marginBottom: '25px', maxWidth: '400px', margin: '0 auto 25px' }}>
              Nosotros nos encargamos del trabajo duro por ti. Solicita tu primer servicio de limpieza o mantenimiento hoy mismo.
            </p>
            <Link to="/agendar" className="btn btn--primary">Agendar mi primera cita</Link>
          </div>
        ) : (
          <div className="apt-grid">
            {appointments.map(apt => (
              <div key={apt.id} className="apt-card card">
                <div className={`badge badge--${statusClass[apt.status] || 'pending'}`}>
                  {statusLabels[apt.status] || apt.status}
                </div>
                <h3 style={{ fontSize: '1.1rem', margin: '15px 0 10px' }}>{apt.service}</h3>
                <div className="apt-card__info" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px', color: '#555', fontSize: '0.9rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Clock size={16} /> {apt.date}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><MapPin size={16} /> {apt.location}</span>
                </div>
                <Link to={`/mi-panel/citas/${apt.id}`} className="btn btn--secondary btn--sm" style={{ width: '100%', textAlign: 'center' }}>
                  {apt.status === 'completed' ? 'Calificar Servicio' : 'Ver Estado / Pagar'} <ChevronRight size={16} />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
