import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Search, Filter, Check, X as XIcon, Eye, User, Calendar, Clock, MapPin, FileText, Layers, Image as ImageIcon, Phone, Mail } from 'lucide-react'
import { getAllAppointments, updateAppointment, verifyDeposit, recordFinalPayment, supabase } from '../../services/api'
import { alertConfirm, toastSuccess, toastError } from '../../lib/notifications'
import {
  APPOINTMENT_STATUS_LABELS as statusLabels,
  APPOINTMENT_STATUS_CLASS as statusClass
} from '../../shared/status'

function buildGcalUrl(apt) {
  const date = apt.appointment_date?.replace(/-/g, '') || ''
  const start = `${date}T${(apt.start_time || '').replace(/:/g, '').slice(0, 6)}`
  const end = `${date}T${(apt.end_time || '').replace(/:/g, '').slice(0, 6)}`
  const serviceNames = (apt.appointment_services || []).map(s => s.services?.name).filter(Boolean).join(', ') || 'Servicio LAP'
  const clientName = apt.profiles?.name || ''
  const text = encodeURIComponent(`Servicio LAP: ${serviceNames} — ${clientName}`)
  const loc = encodeURIComponent(apt.location_address || '')
  const details = encodeURIComponent(`Cliente: ${clientName}\nTeléfono: ${apt.profiles?.phone || 'n/a'}\nServicios: ${serviceNames}\nNotas: ${apt.notes || 'Ninguna'}`)
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}/${end}&location=${loc}&details=${details}`
}

function AppointmentDetailModal({ apt, onClose }) {
  if (!apt) return null

  const profile = apt.profiles || {}
  const services = apt.appointment_services || []

  // Format date nicely
  let dateStr = apt.appointment_date
  if (apt.appointment_date) {
    const [y, m, d] = apt.appointment_date.split('-')
    const dateObj = new Date(y, m - 1, d)
    dateStr = dateObj.toLocaleDateString('es-PA', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
  }

  // Gather unique image URLs (images are duplicated per service row — deduplicate)
  const allImages = [...new Set(services.flatMap(s => s.images || []).filter(Boolean))]

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px'
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: 'var(--dark-800, #1a1a2e)',
          border: '1px solid var(--dark-700, #2a2a3e)',
          borderRadius: '16px',
          width: '100%', maxWidth: '680px',
          maxHeight: '90vh', overflowY: 'auto',
          boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
          color: 'var(--light-100, #f1f5f9)'
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '20px 24px', borderBottom: '1px solid var(--dark-700, #2a2a3e)'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Detalle de Cita</h2>
            <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--dark-400, #64748b)', fontFamily: 'monospace' }}>
              #{apt.id?.slice(0, 8).toUpperCase()}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className={`badge badge--${statusClass[apt.status] || 'pending'}`}>
              {statusLabels[apt.status] || apt.status}
            </span>
            <button
              onClick={onClose}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: 'var(--dark-400)', padding: '4px', borderRadius: '6px',
                display: 'flex', alignItems: 'center'
              }}
            >
              <XIcon size={20} />
            </button>
          </div>
        </div>

        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Client Info */}
          <section>
            <h3 style={{ margin: '0 0 12px', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-primary, #3b82f6)' }}>
              <User size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Datos del Cliente
            </h3>
            <div style={{
              background: 'var(--dark-700, #2a2a3e)', borderRadius: '10px',
              padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'
            }}>
              <InfoRow icon={<User size={14} />} label="Nombre" value={profile.name || '—'} />
              <InfoRow icon={<Mail size={14} />} label="Email" value={profile.email || '—'} />
              <InfoRow icon={<Phone size={14} />} label="Teléfono" value={profile.phone || '—'} />
              <InfoRow icon={<MapPin size={14} />} label="Dirección" value={profile.address || apt.location_address || '—'} />
            </div>
          </section>

          {/* Appointment Info */}
          <section>
            <h3 style={{ margin: '0 0 12px', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-primary, #3b82f6)' }}>
              <Calendar size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Información de la Cita
            </h3>
            <div style={{
              background: 'var(--dark-700, #2a2a3e)', borderRadius: '10px',
              padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'
            }}>
              <InfoRow icon={<Calendar size={14} />} label="Fecha" value={dateStr} fullWidth />
              <InfoRow icon={<Clock size={14} />} label="Hora inicio" value={apt.start_time?.slice(0, 5) || '—'} />
              <InfoRow icon={<Clock size={14} />} label="Hora fin" value={apt.end_time?.slice(0, 5) || '—'} />
              <InfoRow icon={<MapPin size={14} />} label="Ubicación" value={apt.location_address || '—'} fullWidth />
            </div>
          </section>

          {/* Services */}
          <section>
            <h3 style={{ margin: '0 0 12px', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-primary, #3b82f6)' }}>
              <Layers size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Servicios Solicitados
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {services.length === 0 ? (
                <p style={{ color: 'var(--dark-400)', margin: 0, fontSize: '0.9rem' }}>No hay servicios registrados.</p>
              ) : services.map((s, i) => (
                <div key={i} style={{
                  background: 'var(--dark-700, #2a2a3e)', borderRadius: '10px',
                  padding: '14px 16px', borderLeft: '3px solid var(--color-primary, #3b82f6)'
                }}>
                  <p style={{ margin: '0 0 8px', fontWeight: 600, fontSize: '0.95rem' }}>
                    {s.services?.name || 'Servicio desconocido'}
                  </p>
                  {s.custom_details && <CustomDetails serviceName={s.services?.name} details={s.custom_details} />}
                </div>
              ))}
            </div>
          </section>

          {/* Notes */}
          {apt.notes && (
            <section>
              <h3 style={{ margin: '0 0 12px', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-primary, #3b82f6)' }}>
                <FileText size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                Notas del Cliente
              </h3>
              <div style={{
                background: 'var(--dark-700, #2a2a3e)', borderRadius: '10px',
                padding: '14px 16px', fontStyle: 'italic', fontSize: '0.9rem',
                color: 'var(--light-300, #cbd5e1)', lineHeight: 1.6
              }}>
                "{apt.notes}"
              </div>
            </section>
          )}

          {/* Images */}
          {allImages.length > 0 && (
            <section>
              <h3 style={{ margin: '0 0 12px', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-primary, #3b82f6)' }}>
                <ImageIcon size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                Imágenes de Referencia ({allImages.length})
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
                {allImages.map((url, i) => {
                  const isVideo = /\.(mp4|webm|mov|avi)(\?|$)/i.test(url)
                  return isVideo ? (
                    <video
                      key={i} src={url} controls preload="metadata"
                      style={{ display: 'block', borderRadius: '8px', overflow: 'hidden', aspectRatio: '1', background: 'var(--dark-700)', width: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <a key={i} href={url} target="_blank" rel="noreferrer"
                      style={{ display: 'block', borderRadius: '8px', overflow: 'hidden', aspectRatio: '1', background: 'var(--dark-700)' }}>
                      <img
                        src={url} alt={`Imagen ${i + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'opacity 0.2s' }}
                        onError={e => { e.target.style.display = 'none' }}
                      />
                    </a>
                  )
                })}
              </div>
            </section>
          )}

        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid var(--dark-700, #2a2a3e)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap'
        }}>
          {apt.status === 'confirmed' && (
            <a
              href={buildGcalUrl(apt)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--secondary btn--sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Calendar size={14} />
              Agregar a Google Calendar
            </a>
          )}
          <button className="btn btn--secondary" style={{ marginLeft: 'auto' }} onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ icon, label, value, fullWidth }) {
  return (
    <div style={{ gridColumn: fullWidth ? '1 / -1' : 'auto' }}>
      <p style={{ margin: '0 0 2px', fontSize: '0.72rem', color: 'var(--dark-400, #64748b)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px' }}>
        {icon} {label}
      </p>
      <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 500, wordBreak: 'break-word' }}>{value}</p>
    </div>
  )
}

// Returns only the fields relevant to a given service, with Spanish labels
function getRelevantDetails(serviceName, customDetails) {
  if (!customDetails || !serviceName) return null
  const name = serviceName.toLowerCase()

  // Space cleaning services
  if (name.includes('apartamento') || name.includes('casa') || name.includes('oficina') || name.includes('remodelación') || name.includes('remodelacion')) {
    const d = customDetails.space
    if (!d) return null
    const rows = []
    if (d.type)    rows.push({ label: 'Tipo de espacio', value: d.type })
    if (d.sqm)     rows.push({ label: 'Metros cuadrados', value: `${d.sqm} m²` })
    if (d.floor)   rows.push({ label: 'Material del piso', value: d.floor })
    if (d.rooms?.length) rows.push({ label: 'Habitaciones', value: d.rooms.join(', ') })
    return rows
  }

  // Sofa
  if (name.includes('sofá') || name.includes('sofa') || name.includes('sofas')) {
    const d = customDetails.furniture
    if (!d) return null
    const rows = []
    if (d.material) rows.push({ label: 'Material', value: d.material })
    if (d.pieces)   rows.push({ label: 'Piezas', value: d.pieces })
    if (d.seats)    rows.push({ label: 'Asientos / puestos', value: d.seats })
    if (d.notes)    rows.push({ label: 'Notas', value: d.notes })
    return rows
  }

  // Mattress
  if (name.includes('colchón') || name.includes('colchon') || name.includes('colchones')) {
    const d = customDetails.furniture
    if (!d) return null
    const rows = []
    if (d.mattressSize) rows.push({ label: 'Tamaño del colchón', value: d.mattressSize })
    if (d.notes)        rows.push({ label: 'Notas', value: d.notes })
    return rows
  }

  // Carpet
  if (name.includes('alfombra') || name.includes('alfombras')) {
    const d = customDetails.furniture
    if (!d) return null
    const rows = []
    const unit = d.carpetUnit || 'cm'
    if (d.carpetWidth || d.carpetHeight)
      rows.push({ label: 'Medidas', value: `${d.carpetWidth || '?'} × ${d.carpetHeight || '?'} ${unit}` })
    if (d.notes) rows.push({ label: 'Notas', value: d.notes })
    return rows
  }

  // Office chairs
  if (name.includes('silla')) {
    const d = customDetails.furniture
    if (!d) return null
    const rows = []
    if (d.pieces) rows.push({ label: 'Cantidad de sillas', value: d.pieces })
    if (d.notes)  rows.push({ label: 'Notas', value: d.notes })
    return rows
  }

  // Roller blinds – no extra details
  if (name.includes('persiana') || name.includes('roller')) return null

  // AC services
  if (name.includes('split') || name.includes('central') || name.includes('instalación') || name.includes('instalacion') || name.includes('aire')) {
    const d = customDetails.ac
    if (!d) return null
    const rows = []
    if (d.type)  rows.push({ label: 'Tipo de equipo', value: d.type })
    if (d.qty)   rows.push({ label: 'Cantidad de equipos', value: d.qty })
    if (d.brand) rows.push({ label: 'Marca', value: d.brand })
    if (d.btu)   rows.push({ label: 'Capacidad', value: `${d.btu} BTU` })
    return rows
  }

  // Auto detailing
  if (name.includes('auto') || name.includes('detailing') || name.includes('lavado')) return null

  // Repair services
  if (name.includes('plomería') || name.includes('plomeria') || name.includes('electricidad') || name.includes('pintura') || name.includes('reparación') || name.includes('reparacion')) {
    const d = customDetails.repair
    if (!d) return null
    if (d.description) return [{ label: 'Descripción', value: d.description }]
    return null
  }

  return null
}

function CustomDetails({ serviceName, details }) {
  const rows = getRelevantDetails(serviceName, details)
  if (!rows || !rows.length) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
      {rows.map(({ label, value }) => (
        <div key={label} style={{ fontSize: '0.82rem', color: 'var(--dark-400, #94a3b8)' }}>
          <strong style={{ color: 'var(--light-300, #cbd5e1)' }}>{label}: </strong>
          {value}
        </div>
      ))}
    </div>
  )
}

export default function AdminAppointments() {
  const [appointments, setAppointments] = useState([])
  const [rawData, setRawData] = useState([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [selectedApt, setSelectedApt] = useState(null)

  const fetchApts = async () => {
    try {
      const data = await getAllAppointments()
      setRawData(data)
      const formatted = data.map(apt => {
        const serviceNames = apt.appointment_services?.map(as => as.services?.name).join(', ') || 'Sin Servicio'

        let dateStr = apt.appointment_date
        if (apt.appointment_date) {
          const [y, m, d] = apt.appointment_date.split('-')
          const dateObj = new Date(y, m - 1, d)
          dateStr = dateObj.toLocaleDateString('es-PA', { day: '2-digit', month: 'short', year: 'numeric' })
        }

        return {
          id: apt.id,
          client: apt.profiles?.name || 'Usuario',
          service: serviceNames,
          date: dateStr,
          time: apt.start_time?.slice(0, 5),
          status: apt.status,
          calendar_sync_status: apt.calendar_sync_status
        }
      })
      setAppointments(formatted)
    } catch (err) {
      console.error('Error fetching admin apts', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchApts()
  }, [])

  const handleUpdateStatus = async (id, newStatus) => {
    const labelMap = { confirmed: 'Confirmada', completed: 'Completada', cancelled: 'Cancelada' }
    const confirmed = await alertConfirm('Cambiar Estado', `¿Seguro que deseas marcar la cita como ${labelMap[newStatus] || newStatus}?`)
    if (!confirmed) return
    try {
      await updateAppointment(id, { status: newStatus })

      // Si se confirma la cita → verificar automáticamente el abono pendiente
      if (newStatus === 'confirmed') {
        const { data: deposit } = await supabase
          .from('payments')
          .select('id')
          .eq('appointment_id', id)
          .eq('payment_type', 'deposit')
          .eq('status', 'pending')
          .single()
        if (deposit) {
          await verifyDeposit(deposit.id)
          toastSuccess('Cita confirmada y abono verificado.')
        } else {
          toastSuccess('Cita marcada como Confirmada.')
        }
      }

      // Si se completa el servicio → registrar el 50% final como asumido
      if (newStatus === 'completed') {
        await recordFinalPayment(id)
        toastSuccess('Servicio completado. Pago final registrado como ingreso.')
      }

      if (newStatus === 'cancelled') {
        toastSuccess('Cita cancelada.')
      }

      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a))
    } catch (error) {
      console.error('Error updating status', error)
      toastError('Hubo un error al actualizar el estado')
    }
  }

  const handleViewDetails = (id) => {
    const apt = rawData.find(a => a.id === id)
    setSelectedApt(apt || null)
  }

  const filtered = appointments.filter(a => {
    const matchSearch = !search || a.client.toLowerCase().includes(search.toLowerCase()) || a.service.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || a.status === filter
    return matchSearch && matchFilter
  })

  return (
    <div style={{ padding: 'var(--space-8)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>Gestión de Citas</h1>
          <p style={{ color: 'var(--dark-400)' }}>Administra todas las solicitudes de citas</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-6)', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '320px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--dark-400)' }} />
          <input className="form-input" style={{ paddingLeft: '38px', width: '100%' }} placeholder="Buscar cliente o servicio..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {['all', 'pending', 'quotation_sent', 'confirmed', 'completed', 'payment_uploaded'].map(f => (
          <button key={f} className={`filter-chip ${filter === f ? 'filter-chip--active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? 'Todas' : statusLabels[f]}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>Cargando citas...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: 'var(--space-4) var(--space-5)', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--dark-400)', borderBottom: '2px solid var(--light-300)', letterSpacing: '0.05em' }}>Cliente</th>
                <th style={{ textAlign: 'left', padding: 'var(--space-4) var(--space-5)', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--dark-400)', borderBottom: '2px solid var(--light-300)' }}>Servicio</th>
                <th style={{ textAlign: 'left', padding: 'var(--space-4) var(--space-5)', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--dark-400)', borderBottom: '2px solid var(--light-300)' }}>Fecha</th>
                <th style={{ textAlign: 'left', padding: 'var(--space-4) var(--space-5)', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--dark-400)', borderBottom: '2px solid var(--light-300)' }}>Hora</th>
                <th style={{ textAlign: 'left', padding: 'var(--space-4) var(--space-5)', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--dark-400)', borderBottom: '2px solid var(--light-300)' }}>Estado</th>
                <th style={{ textAlign: 'left', padding: 'var(--space-4) var(--space-5)', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--dark-400)', borderBottom: '2px solid var(--light-300)' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a.id} style={{ transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--light-300)', fontWeight: 600 }}>{a.client}</td>
                  <td style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--light-300)', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.service}</td>
                  <td style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--light-300)' }}>{a.date}</td>
                  <td style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--light-300)' }}>{a.time}</td>
                  <td style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--light-300)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                      <span className={`badge badge--${statusClass[a.status] || 'pending'}`}>{statusLabels[a.status] || a.status}</span>
                      {a.status === 'confirmed' && a.calendar_sync_status === 'synced' && (
                        <span title="Evento creado en Google Calendar" style={{ fontSize: '0.7rem', color: '#2E7D32', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                          <Calendar size={11} /> Calendar
                        </span>
                      )}
                      {a.status === 'confirmed' && a.calendar_sync_status === 'fallback_ics' && (
                        <span title="Google Calendar no disponible — se envió .ics por correo" style={{ fontSize: '0.7rem', color: '#E65100', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                          <Calendar size={11} /> ICS
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--light-300)' }}>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                      {a.status === 'pending' && (
                        <Link to={`/admin/cotizaciones/nueva?appointment_id=${a.id}`} className="btn btn--secondary btn--sm" title="Crear Cotización">Cotizar</Link>
                      )}
                      {a.status === 'quotation_sent' && (
                        <Link to="/admin/cotizaciones" className="btn btn--secondary btn--sm" title="Ver Cotización">Ver Coti</Link>
                      )}
                      {(a.status === 'payment_uploaded' || a.status === 'quotation_sent' || a.status === 'modification_requested') && (
                        <button className="btn btn--primary btn--sm" title="Confirmar cita y verificar abono" onClick={() => handleUpdateStatus(a.id, 'confirmed')}><Check size={14} /> Confirmar</button>
                      )}
                      {a.status === 'confirmed' && (
                        <button className="btn btn--primary btn--sm" style={{ background: '#2E7D32' }} title="Marcar como completado" onClick={() => handleUpdateStatus(a.id, 'completed')}>Completar</button>
                      )}
                      {a.status !== 'completed' && a.status !== 'cancelled' && (
                        <button className="btn btn--danger btn--sm" title="Cancelar" onClick={() => handleUpdateStatus(a.id, 'cancelled')}><XIcon size={14} /></button>
                      )}
                      <button className="btn btn--secondary btn--sm" title="Ver detalles" onClick={() => handleViewDetails(a.id)}>
                        <Eye size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--dark-400)' }}>No se encontraron citas.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Modal */}
      {selectedApt && (
        <AppointmentDetailModal
          apt={selectedApt}
          onClose={() => setSelectedApt(null)}
        />
      )}
    </div>
  )
}
