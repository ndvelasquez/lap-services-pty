import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Clock, Users, DollarSign, TrendingUp, ChevronRight, CheckCircle } from 'lucide-react'
import { getAllAppointments, supabase } from '../../services/api'
import './AdminDashboard.css'

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
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [totalClients, setTotalClients] = useState(0)
  const [historicalIncome, setHistoricalIncome] = useState(0)
  const [chartData, setChartData] = useState([])

  const fetchDashboardData = async () => {
    try {
      const apts = await getAllAppointments()
      // get total clients (unique users in profiles with role client, or just count logic)
      const { count: clientCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).neq('role', 'admin')
      
      // Calculate historical income from accepted quotations
      const { data: quotes } = await supabase.from('quotations').select('total').eq('status', 'accepted')
      const income = quotes?.reduce((sum, q) => sum + (q.total || 0), 0) || 0
      
      const formatted = apts.map(apt => {
        const serviceNames = apt.appointment_services?.map(as => as.services?.name).join(', ') || 'Sin Servicio'
        return {
          id: apt.id,
          client: apt.profiles?.name || 'Cliente sin nombre',
          service: serviceNames,
          date: apt.appointment_date,
          time: apt.start_time?.slice(0,5),
          status: apt.status
        }
      })

      // Aggregate last 7 days for the chart
      const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
      const last7Days = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const dateStr = d.toISOString().split('T')[0]
        const count = formatted.filter(a => a.date === dateStr).length
        last7Days.push({ day: dayNames[d.getDay()], value: count })
      }

      setAppointments(formatted)
      setTotalClients(clientCount || 0)
      setHistoricalIncome(income)
      setChartData(last7Days)
    } catch (err) {
      console.error('Error fetching admin dash', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const maxVal = Math.max(...(chartData.length > 0 ? chartData.map(d => d.value) : [1]))

  const todayStr = new Date().toISOString().split('T')[0]
  const todayAppointments = appointments.filter(a => a.date === todayStr)
  const pendingCount = appointments.filter(a => a.status === 'pending' || a.status === 'quotation_sent' || a.status === 'modification_requested').length

  const kpis = [
    { id: 'kpi-today', icon: Calendar, label: 'Citas Hoy', value: todayAppointments.length.toString(), change: null, color: '#2E7D32' },
    { id: 'kpi-pending', icon: Clock, label: 'Pendientes', value: pendingCount.toString(), change: null, color: '#FF9800' },
    { id: 'kpi-income', icon: DollarSign, label: 'Ingresos Históricos', value: `$${historicalIncome.toFixed(2)}`, change: null, color: '#4CAF50' },
    { id: 'kpi-clients', icon: Users, label: 'Clientes Registrados', value: totalClients.toString(), change: '+1 hoy', color: '#2196F3' },
  ]

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
        {kpis.map((kpi) => (
          <div key={kpi.id} className="kpi-card card" data-testid={kpi.id}>
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
            <div className="today-list" data-testid="today-list">
              {loading ? (
                <p style={{ textAlign: 'center', padding: '20px', color: '#666' }}>Cargando...</p>
              ) : todayAppointments.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '20px', color: '#666' }}>No hay citas agendadas para hoy.</p>
              ) : todayAppointments.map((apt, i) => (
                <div key={i} className={`today-item`}>
                  <span className="today-item__time">{apt.time}</span>
                  <div className="today-item__info">
                    <strong>{apt.client || 'Sin agendar'}</strong>
                    <span>{apt.service}</span>
                  </div>
                  <span className={`badge badge--${apt.status === 'confirmed' ? 'confirmed' : 'pending'}`}>
                    {apt.status === 'confirmed' ? 'Confirmada' : apt.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2>Citas por Día (Semana)</h2>
            <div className="chart-bars" data-testid="chart-bars">
              {chartData.map((d, i) => (
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
            <div className="activity-list" data-testid="activity-list">
              {loading ? (
                 <p style={{ textAlign: 'center', padding: '20px', color: '#666' }}>Cargando...</p>
              ) : appointments.slice(0, 5).map((a, i) => (
                <div key={i} className="activity-item">
                  <div className="activity-dot" />
                  <div>
                    <p>Nueva solicitud: {a.client}</p>
                    <span style={{ fontSize: '13px' }}>Fecha: {a.date} | {a.time}</span>
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

