import { useState } from 'react'
import { ChevronLeft, ChevronRight, Clock, MapPin, User, X } from 'lucide-react'
import './AdminCalendar.css'

const HOURS = Array.from({ length: 11 }, (_, i) => `${(i + 7).toString().padStart(2, '0')}:00`)
const WEEK_DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const events = [
  { day: 0, start: 9, end: 11, client: 'M. García', service: 'Limpieza Apto', type: 'clean' },
  { day: 0, start: 14, end: 15, client: 'P. López', service: 'Lavado AC', type: 'ac' },
  { day: 1, start: 8, end: 10, client: 'Corp. ABC', service: 'Limpieza Oficina', type: 'clean' },
  { day: 1, start: 11, end: 12, client: 'J. Rodríguez', service: 'Reparación', type: 'repair' },
  { day: 2, start: 10, end: 12, client: 'A. Sánchez', service: 'Limpieza Muebles', type: 'ac' },
  { day: 4, start: 10, end: 12, client: 'L. Martínez', service: 'Limpieza Apto', type: 'clean' },
  { day: 4, start: 14, end: 16, client: 'R. Hernández', service: 'Lavado AC x3', type: 'ac' },
  { day: 5, start: 8, end: 12, client: 'F. Torres', service: 'Limpieza Casa', type: 'clean' },
]

const blocked = [3, 6]

const typeColors = { clean: '#2E7D32', ac: '#4CAF50', repair: '#FF9800' }

export default function AdminCalendar() {
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [weekOffset, setWeekOffset] = useState(0)

  const baseDate = new Date(2026, 2, 23)
  baseDate.setDate(baseDate.getDate() + weekOffset * 7)

  const weekDates = WEEK_DAYS.map((_, i) => {
    const d = new Date(baseDate)
    d.setDate(d.getDate() + i)
    return d
  })

  return (
    <div className="admin-cal">
      <div className="admin-cal__header">
        <div>
          <h1>Gestión de Calendario</h1>
          <p>Administra la disponibilidad y citas</p>
        </div>
        <div className="admin-cal__controls">
          <div className="admin-cal__nav">
            <button onClick={() => setWeekOffset(w => w - 1)}><ChevronLeft size={18} /></button>
            <span>Semana del {weekDates[0].getDate()} - {weekDates[6].getDate()} de Marzo, 2026</span>
            <button onClick={() => setWeekOffset(w => w + 1)}><ChevronRight size={18} /></button>
          </div>
        </div>
      </div>

      <div className="admin-cal__body">
        <div className="cal-grid-wrapper">
          <div className="cal-grid">
            {/* Header */}
            <div className="cal-grid__corner" />
            {WEEK_DAYS.map((day, i) => (
              <div key={i} className={`cal-grid__day-header ${blocked.includes(i) ? 'cal-grid__day-header--blocked' : ''}`}>
                <span className="cal-grid__day-name">{day}</span>
                <span className="cal-grid__day-date">{weekDates[i].getDate()}</span>
              </div>
            ))}

            {/* Hours + cells */}
            {HOURS.map((hour, hi) => (
              <>
                <div key={`h-${hi}`} className="cal-grid__hour">{hour}</div>
                {WEEK_DAYS.map((_, di) => {
                  const hourNum = hi + 7
                  const event = events.find(e => e.day === di && e.start === hourNum)
                  const isBlocked = blocked.includes(di)

                  return (
                    <div
                      key={`c-${hi}-${di}`}
                      className={`cal-grid__cell ${isBlocked ? 'cal-grid__cell--blocked' : ''}`}
                    >
                      {event && (
                        <div
                          className="cal-event"
                          style={{
                            height: `${(event.end - event.start) * 50}px`,
                            background: typeColors[event.type],
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
              </>
            ))}
          </div>
        </div>

        {/* Detail Panel */}
        {selectedEvent && (
          <div className="cal-detail card">
            <div className="cal-detail__header">
              <h3>Detalle de Cita</h3>
              <button onClick={() => setSelectedEvent(null)}><X size={18} /></button>
            </div>
            <div className="cal-detail__row"><User size={16} /> <span>{selectedEvent.client}</span></div>
            <div className="cal-detail__row"><Clock size={16} /> <span>{`${selectedEvent.start}:00 - ${selectedEvent.end}:00`}</span></div>
            <div className="cal-detail__row" style={{ color: typeColors[selectedEvent.type] }}>
              <span>●</span> <span>{selectedEvent.service}</span>
            </div>
            <div className="cal-detail__actions">
              <button className="btn btn--secondary btn--sm">Modificar</button>
              <button className="btn btn--danger btn--sm">Cancelar</button>
            </div>
          </div>
        )}
      </div>

      <div className="cal-legend">
        <span><span className="cal-legend__dot" style={{ background: '#2E7D32' }} /> Limpieza</span>
        <span><span className="cal-legend__dot" style={{ background: '#4CAF50' }} /> AC / Muebles</span>
        <span><span className="cal-legend__dot" style={{ background: '#FF9800' }} /> Reparaciones</span>
        <span><span className="cal-legend__dot" style={{ background: '#9E9E9E' }} /> Bloqueado</span>
      </div>
    </div>
  )
}
