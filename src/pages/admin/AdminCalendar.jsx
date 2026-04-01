import { useState, useEffect, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Clock, MapPin, User, X } from 'lucide-react'
import { getAllAppointments } from '../../services/api'
import './AdminCalendar.css'

const HOURS = Array.from({ length: 11 }, (_, i) => `${(i + 7).toString().padStart(2, '0')}:00`)
const WEEK_DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

// Helper to get type color based on service name/category
const getTypeInfo = (serviceName = '') => {
  const name = serviceName.toLowerCase()
  if (name.includes('aire') || name.includes('ac') || name.includes('mueble') || name.includes('alfombra')) {
    return { type: 'ac', color: '#4CAF50' }
  }
  if (name.includes('reparación') || name.includes('mantenimiento')) {
    return { type: 'repair', color: '#FF9800' }
  }
  return { type: 'clean', color: '#2E7D32' } // default
}

export default function AdminCalendar() {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [weekOffset, setWeekOffset] = useState(0)

  // Calculemos el lunes de la semana actual basado en el offset
  const baseDate = useMemo(() => {
    const d = new Date()
    // Ajustar al lunes de esta semana
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) 
    const monday = new Date(d.setDate(diff))
    monday.setHours(0,0,0,0)
    // Aplicar el offset de semana
    monday.setDate(monday.getDate() + (weekOffset * 7))
    return monday
  }, [weekOffset])

  const weekDates = useMemo(() => {
    return WEEK_DAYS.map((_, i) => {
      const d = new Date(baseDate)
      d.setDate(d.getDate() + i)
      return d
    })
  }, [baseDate])

  const monthName = baseDate.toLocaleString('es-PA', { month: 'long' })
  const yearNum = baseDate.getFullYear()

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const data = await getAllAppointments()
      setAppointments(data || [])
    } catch (err) {
      console.error('Error fetching calendar data', err)
    } finally {
      setLoading(false)
    }
  }

  // Mapear citas de la base de datos a eventos del calendario para la semana actual
  const events = useMemo(() => {
    const startDate = new Date(baseDate)
    const endDate = new Date(baseDate)
    endDate.setDate(endDate.getDate() + 7)

    return appointments
      .filter(apt => {
        const aptDate = new Date(apt.appointment_date + 'T00:00:00')
        return aptDate >= startDate && aptDate < endDate && apt.status !== 'cancelled'
      })
      .map(apt => {
        const aptDate = new Date(apt.appointment_date + 'T00:00:00')
        const dayIdx = (aptDate.getDay() + 6) % 7 // Convertir 0 (Dom) - 6 (Sáb) a 0 (Lun) - 6 (Dom)
        
        const startHour = parseInt(apt.start_time?.split(':')[0] || '8')
        const endHour = parseInt(apt.end_time?.split(':')[0] || (startHour + 2).toString())
        
        const serviceName = apt.appointment_services?.[0]?.services?.name || 'Servicio'
        const { type, color } = getTypeInfo(serviceName)

        return {
          id: apt.id,
          day: dayIdx,
          start: startHour,
          end: endHour,
          client: apt.profiles?.name || 'Cliente',
          service: serviceName,
          type: type,
          color: color,
          location: apt.location_address,
          status: apt.status
        }
      })
  }, [appointments, baseDate])

  return (
    <div className="admin-cal">
      <div className="admin-cal__header">
        <div>
          <h1 data-testid="calendar-title">Gestión de Calendario</h1>
          <p>Administra la disponibilidad y citas reales</p>
        </div>
        <div className="admin-cal__controls">
          <div className="admin-cal__nav">
            <button onClick={() => setWeekOffset(w => w - 1)} title="Semana anterior"><ChevronLeft size={18} /></button>
            <span style={{ textTransform: 'capitalize' }}>
              Semana del {weekDates[0].getDate()} al {weekDates[6].getDate()} de {monthName}, {yearNum}
            </span>
            <button onClick={() => setWeekOffset(w => w + 1)} title="Siguiente semana"><ChevronRight size={18} /></button>
          </div>
        </div>
      </div>

      <div className="admin-cal__body">
        <div className="cal-grid-wrapper">
          {loading ? (
            <div style={{ padding: '100px', textAlign: 'center' }}>Cargando agenda...</div>
          ) : (
            <div className="cal-grid">
              {/* Header */}
              <div className="cal-grid__corner" />
              {WEEK_DAYS.map((day, i) => {
                const isToday = new Date().toDateString() === weekDates[i].toDateString()
                return (
                  <div key={i} className={`cal-grid__day-header ${isToday ? 'cal-grid__day-header--today' : ''}`}>
                    <span className="cal-grid__day-name">{day}</span>
                    <span className="cal-grid__day-date">{weekDates[i].getDate()}</span>
                  </div>
                )
              })}

              {/* Hours + cells */}
              {HOURS.map((hour, hi) => (
                <div key={`row-${hi}`} style={{ display: 'contents' }}>
                  <div className="cal-grid__hour">{hour}</div>
                  {WEEK_DAYS.map((_, di) => {
                    const hourNum = hi + 7
                    // Buscar si hay un evento que inicie a esta hora en este día
                    const event = events.find(e => e.day === di && e.start === hourNum)

                    return (
                      <div key={`c-${hi}-${di}`} className="cal-grid__cell">
                        {event && (
                          <div
                            className="cal-event"
                            data-testid={`event-${event.id}`}
                            style={{
                              height: `${Math.max(1, event.end - event.start) * 50 - 4}px`,
                              background: event.color,
                            }}
                            onClick={() => setSelectedEvent(event)}
                          >
                            <span className="cal-event__title">{event.service}</span>
                            <span className="cal-event__client">{event.client}</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selectedEvent && (
          <div className="cal-detail card" data-testid="event-detail-panel">
            <div className="cal-detail__header">
              <h3>Detalle de Cita</h3>
              <button onClick={() => setSelectedEvent(null)}><X size={18} /></button>
            </div>
            <div className="cal-detail__row"><User size={16} /> <span>{selectedEvent.client}</span></div>
            <div className="cal-detail__row"><Clock size={16} /> <span>{`${selectedEvent.start}:00 - ${selectedEvent.end}:00`}</span></div>
            {selectedEvent.location && (
               <div className="cal-detail__row"><MapPin size={16} /> <span style={{ fontSize: '0.8rem' }}>{selectedEvent.location}</span></div>
            )}
            <div className="cal-detail__row" style={{ color: selectedEvent.color }}>
              <span>●</span> <span>{selectedEvent.service}</span>
            </div>
            <div style={{ marginTop: '12px' }}>
               <span className={`badge badge--pending`}>{selectedEvent.status}</span>
            </div>
            <div className="cal-detail__actions">
              <button className="btn btn--secondary btn--sm">Ver en Citas</button>
              <button className="btn btn--danger btn--sm" onClick={() => setSelectedEvent(null)}>Cerrar</button>
            </div>
          </div>
        )}
      </div>

      <div className="cal-legend">
        <span><span className="cal-legend__dot" style={{ background: '#2E7D32' }} /> Limpieza</span>
        <span><span className="cal-legend__dot" style={{ background: '#4CAF50' }} /> AC / Muebles</span>
        <span><span className="cal-legend__dot" style={{ background: '#FF9800' }} /> Reparaciones</span>
      </div>
    </div>
  )
}
