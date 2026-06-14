import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Calendar, Bell, ChevronRight, Clock, MapPin, PlusCircle, X } from 'lucide-react'
import { getCurrentUser, getClientAppointments, savePushSubscription } from '../../services/api'
import {
  APPOINTMENT_STATUS_LABELS as statusLabels,
  APPOINTMENT_STATUS_CLASS as statusClass
} from '../../shared/status'
import './ClientDashboard.css'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}


export default function ClientDashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showPushBanner, setShowPushBanner] = useState(false)
  const [pushSubscribed, setPushSubscribed] = useState(false)

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

        // Show push banner if supported and not yet granted
        if ('Notification' in window && Notification.permission === 'default' && VAPID_PUBLIC_KEY) {
          setShowPushBanner(true)
        }
        if ('Notification' in window && Notification.permission === 'granted') {
          setPushSubscribed(true)
        }
      } catch (err) {
        console.error('Error loading dashboard', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [navigate])

  async function handleEnablePush() {
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') { setShowPushBanner(false); return }
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      })
      await savePushSubscription(user.id, subscription.toJSON())
      setPushSubscribed(true)
      setShowPushBanner(false)
    } catch (err) {
      console.warn('Push subscription failed:', err)
      setShowPushBanner(false)
    }
  }

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

        {/* Push notification banner */}
        {showPushBanner && !pushSubscribed && (
          <div className="push-banner">
            <Bell size={18} className="push-banner__icon" />
            <span className="push-banner__text">
              Activa notificaciones para recibir actualizaciones de tus citas en tiempo real.
            </span>
            <div className="push-banner__actions">
              <button className="btn btn--primary btn--sm" onClick={handleEnablePush}>
                Activar
              </button>
              <button className="push-banner__dismiss" onClick={() => setShowPushBanner(false)} aria-label="Cerrar">
                <X size={16} />
              </button>
            </div>
          </div>
        )}

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
