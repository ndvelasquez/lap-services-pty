import { Link } from 'react-router-dom'
import { Calendar, Clock, Users, DollarSign, TrendingUp, ChevronRight, CheckCircle } from 'lucide-react'
import './AdminDashboard.css'

const kpis = [
  { icon: Calendar, label: 'Citas Hoy', value: '8', change: '+12%', color: '#2E7D32' },
  { icon: Clock, label: 'Pendientes', value: '15', change: null, color: '#FF9800' },
  { icon: DollarSign, label: 'Ingresos del Mes', value: '$4,850', change: '+8%', color: '#4CAF50' },
  { icon: Users, label: 'Clientes Activos', value: '127', change: '+5%', color: '#2196F3' },
]

const todayAppointments = [
  { time: '08:00 AM', client: 'María García', service: 'Limpieza de Apartamento', status: 'confirmed' },
  { time: '10:00 AM', client: 'Carlos López', service: 'Lavado de AC (x3)', status: 'confirmed' },
  { time: '12:00 PM', client: 'Ana Rodríguez', service: 'Limpieza de Muebles', status: 'pending' },
  { time: '02:00 PM', client: 'Pedro Martínez', service: 'Reparación plomería', status: 'confirmed' },
  { time: '04:00 PM', client: null, service: 'Disponible', status: 'available' },
]

const activity = [
  { text: 'Nueva solicitud de cita — Laura Sánchez', time: 'hace 10 min' },
  { text: 'Cotización COT-045 aceptada — $285.00', time: 'hace 1 hora' },
  { text: 'Cita completada — María García', time: 'hace 2 horas' },
  { text: 'Nuevo cliente registrado — José Hernández', time: 'hace 3 horas' },
  { text: 'Cotización enviada COT-046', time: 'hace 5 horas' },
]

const weekData = [
  { day: 'Lun', value: 6 },
  { day: 'Mar', value: 8 },
  { day: 'Mié', value: 5 },
  { day: 'Jue', value: 9 },
  { day: 'Vie', value: 7 },
  { day: 'Sáb', value: 4 },
  { day: 'Dom', value: 0 },
]

export default function AdminDashboard() {
  const maxVal = Math.max(...weekData.map(d => d.value))

  return (
    <div className="admin-dash">
      <div className="admin-dash__header">
        <div>
          <h1>Dashboard</h1>
          <p>Bienvenido de vuelta, Admin</p>
        </div>
        <Link to="/admin/citas" className="btn btn--primary">
          Ver Todas las Citas
        </Link>
      </div>

      <div className="kpi-grid">
        {kpis.map((kpi, i) => (
          <div key={i} className="kpi-card card">
            <div className="kpi-card__icon" style={{ background: `${kpi.color}15`, color: kpi.color }}>
              <kpi.icon size={22} />
            </div>
            <div className="kpi-card__data">
              <span className="kpi-card__value">{kpi.value}</span>
              <span className="kpi-card__label">{kpi.label}</span>
            </div>
            {kpi.change && (
              <span className="kpi-card__change">
                <TrendingUp size={14} /> {kpi.change}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="admin-dash__body">
        <div className="admin-dash__main">
          <div className="card">
            <h2>Citas del Día</h2>
            <div className="today-list">
              {todayAppointments.map((apt, i) => (
                <div key={i} className={`today-item ${apt.status === 'available' ? 'today-item--available' : ''}`}>
                  <span className="today-item__time">{apt.time}</span>
                  <div className="today-item__info">
                    <strong>{apt.client || 'Sin agendar'}</strong>
                    <span>{apt.service}</span>
                  </div>
                  {apt.status !== 'available' && (
                    <span className={`badge badge--${apt.status === 'confirmed' ? 'confirmed' : 'pending'}`}>
                      {apt.status === 'confirmed' ? 'Confirmada' : 'Pendiente'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2>Citas por Día</h2>
            <div className="chart-bars">
              {weekData.map((d, i) => (
                <div key={i} className="chart-bar-col">
                  <div className="chart-bar" style={{ height: `${maxVal > 0 ? (d.value / maxVal) * 120 : 0}px` }}>
                    <span className="chart-bar__value">{d.value}</span>
                  </div>
                  <span className="chart-bar__label">{d.day}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="admin-dash__side">
          <div className="card">
            <h2>Actividad Reciente</h2>
            <div className="activity-list">
              {activity.map((a, i) => (
                <div key={i} className="activity-item">
                  <div className="activity-dot" />
                  <div>
                    <p>{a.text}</p>
                    <span>{a.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
