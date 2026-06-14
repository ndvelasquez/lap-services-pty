import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, Calendar, Clock, MapPin, Layers, Image as ImageIcon,
  FileText, Upload, CheckCircle, XCircle, Edit3, ExternalLink, ChevronRight
} from 'lucide-react'
import {
  getAppointment, getCurrentUser, getQuotationByAppointmentId,
  uploadPaymentProof, requestModification
} from '../../services/api'
import { toastSuccess, toastError, alertConfirm } from '../../lib/notifications'
import {
  APPOINTMENT_STATUS_LABELS as STATUS_LABELS,
  APPOINTMENT_STATUS_CLASS as STATUS_CLASS
} from '../../shared/status'
import './AppointmentDetail.css'

const TIMELINE_STEPS = [
  { key: 'pending',               label: 'Solicitud enviada' },
  { key: 'quotation_sent',        label: 'Cotización enviada' },
  { key: 'modification_requested',label: 'Cambio solicitado' },
  { key: 'payment_uploaded',      label: 'Pago en revisión' },
  { key: 'confirmed',             label: 'Cita confirmada' },
  { key: 'completed',             label: 'Servicio completado' },
]
const TIMELINE_ORDER = TIMELINE_STEPS.map(s => s.key)

function getRelevantDetails(serviceName, customDetails) {
  if (!customDetails || !serviceName) return null
  const name = serviceName.toLowerCase()
  if (name.includes('apartamento') || name.includes('casa') || name.includes('oficina') || name.includes('remodelac')) {
    const d = customDetails.space
    if (!d) return null
    const rows = []
    if (d.type)         rows.push({ label: 'Tipo de espacio', value: d.type })
    if (d.sqm)          rows.push({ label: 'Metros cuadrados', value: `${d.sqm} m²` })
    if (d.floor)        rows.push({ label: 'Material del piso', value: d.floor })
    if (d.rooms?.length) rows.push({ label: 'Habitaciones', value: d.rooms.join(', ') })
    return rows
  }
  if (name.includes('sofá') || name.includes('sofa')) {
    const d = customDetails.furniture
    if (!d) return null
    const rows = []
    if (d.material) rows.push({ label: 'Material', value: d.material })
    if (d.pieces)   rows.push({ label: 'Piezas', value: d.pieces })
    if (d.seats)    rows.push({ label: 'Asientos', value: d.seats })
    return rows
  }
  if (name.includes('colchón') || name.includes('colchon')) {
    const d = customDetails.furniture
    if (!d) return null
    if (d.mattressSize) return [{ label: 'Tamaño', value: d.mattressSize }]
  }
  if (name.includes('alfombra')) {
    const d = customDetails.furniture
    if (!d) return null
    const unit = d.carpetUnit || 'cm'
    if (d.carpetWidth || d.carpetHeight)
      return [{ label: 'Medidas', value: `${d.carpetWidth || '?'} × ${d.carpetHeight || '?'} ${unit}` }]
  }
  if (name.includes('silla')) {
    const d = customDetails.furniture
    if (!d) return null
    if (d.pieces) return [{ label: 'Cantidad de sillas', value: d.pieces }]
  }
  if (name.includes('split') || name.includes('central') || name.includes('aire')) {
    const d = customDetails.ac
    if (!d) return null
    const rows = []
    if (d.type)  rows.push({ label: 'Tipo de equipo', value: d.type })
    if (d.qty)   rows.push({ label: 'Cantidad', value: d.qty })
    if (d.brand) rows.push({ label: 'Marca', value: d.brand })
    if (d.btu)   rows.push({ label: 'Capacidad', value: `${d.btu} BTU` })
    return rows
  }
  if (name.includes('plomer') || name.includes('electricidad') || name.includes('pintura') || name.includes('reparac')) {
    const d = customDetails.repair
    if (d?.description) return [{ label: 'Descripción', value: d.description }]
  }
  return null
}

function buildGcalUrl(apt, serviceNames) {
  const date = apt.appointment_date.replace(/-/g, '')
  const start = `${date}T${apt.start_time.replace(/:/g, '').slice(0, 6)}`
  const end = `${date}T${apt.end_time.replace(/:/g, '').slice(0, 6)}`
  const text = encodeURIComponent(`Servicio LAP: ${serviceNames}`)
  const loc = encodeURIComponent(apt.location_address || '')
  const details = encodeURIComponent(`Cita confirmada con LAP Services Panamá.`)
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}/${end}&location=${loc}&details=${details}`
}

function isVideoUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return /\.(mp4|webm|mov|avi|m4v|mkv|hevc)(\?|$)/i.test(url.trim()) || url.toLowerCase().includes('video');
}

export default function AppointmentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [apt, setApt] = useState(null)
  const [quotation, setQuotation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [paymentFile, setPaymentFile] = useState(null)
  const [paymentUploading, setPaymentUploading] = useState(false)
  const [modifyNotes, setModifyNotes] = useState('')
  const [modifySubmitting, setModifySubmitting] = useState(false)
  const [showModifyForm, setShowModifyForm] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [appointment, user] = await Promise.all([getAppointment(id), getCurrentUser()])
        if (!user) { navigate('/login'); return }
        if (appointment.client_id !== user.id) { navigate('/mi-panel'); return }
        setApt(appointment)

        // Try to load linked quotation
        try {
          const q = await getQuotationByAppointmentId(id)
          setQuotation(q)
        } catch {
          // No quotation yet — that's fine
        }
      } catch (err) {
        setError('No se pudo cargar la cita. Por favor intenta de nuevo.')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, navigate])

  async function handlePaymentUpload() {
    if (!paymentFile) return
    // Validar tipo y tamaño antes de subir
    const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    const MAX_BYTES = 10 * 1024 * 1024 // 10 MB
    if (!ALLOWED.includes(paymentFile.type)) {
      toastError('Formato no válido. Sube una imagen (JPG, PNG, WEBP) o un PDF.')
      return
    }
    if (paymentFile.size > MAX_BYTES) {
      toastError('El archivo supera el límite de 10 MB.')
      return
    }
    setPaymentUploading(true)
    try {
      await uploadPaymentProof(apt.id, paymentFile)
      toastSuccess('Comprobante de pago enviado correctamente.')
      // Refresh appointment
      const updated = await getAppointment(id)
      setApt(updated)
      setPaymentFile(null)
    } catch (err) {
      toastError('Error al subir el comprobante. Intenta de nuevo.')
      console.error(err)
    } finally {
      setPaymentUploading(false)
    }
  }

  async function handleModifySubmit() {
    if (!modifyNotes.trim()) { toastError('Por favor escribe los cambios que necesitas.'); return }
    const confirmed = await alertConfirm('¿Confirmar solicitud de cambios?', `Tu solicitud será enviada: "${modifyNotes}"`)
    if (!confirmed) return
    setModifySubmitting(true)
    try {
      await requestModification(apt.id, modifyNotes)
      toastSuccess('Solicitud de cambios enviada. El equipo te contactará pronto.')
      setModifyNotes('')
      setShowModifyForm(false)
      const updated = await getAppointment(id)
      setApt(updated)
    } catch (err) {
      toastError('Error al enviar la solicitud. Intenta de nuevo.')
      console.error(err)
    } finally {
      setModifySubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="apt-detail-page">
        <div className="container">
          <div className="apt-detail-loading">Cargando detalle de cita...</div>
        </div>
      </div>
    )
  }
  if (error || !apt) {
    return (
      <div className="apt-detail-page">
        <div className="container">
          <div className="card apt-detail-error">
            <p>{error || 'Cita no encontrada.'}</p>
            <Link to="/mi-panel" className="btn btn--secondary">Volver al panel</Link>
          </div>
        </div>
      </div>
    )
  }

  const services = apt.appointment_services || []
  const serviceNames = services.map(s => s.services?.name).filter(Boolean).join(', ') || 'Servicio de Limpieza'
  
  let rawMedia = []
  services.forEach(s => {
    let imgs = s.images
    if (typeof imgs === 'string') {
      try { imgs = JSON.parse(imgs) } catch { imgs = [imgs] }
    }
    if (Array.isArray(imgs)) {
      imgs.forEach(url => {
        if (typeof url === 'string') {
          // Break by comma in case it was stored incorrectly as "url1,url2"
          url.split(',').forEach(u => rawMedia.push(u.trim()))
        }
      })
    }
  })
  const allMedia = [...new Set(rawMedia.filter(Boolean))]

  let dateStr = apt.appointment_date
  if (apt.appointment_date) {
    const [y, m, d] = apt.appointment_date.split('-')
    dateStr = new Date(y, m - 1, d).toLocaleDateString('es-PA', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
    })
  }

  const currentStepIndex = TIMELINE_ORDER.indexOf(apt.status)

  const showQuotationCTA = quotation && ['quotation_sent', 'payment_uploaded', 'confirmed', 'completed', 'modification_requested'].includes(apt.status)
  const showPaymentUpload = quotation?.status === 'accepted' && apt.status === 'quotation_sent'
  const showModifyOption = apt.status === 'quotation_sent' && quotation?.status === 'sent'
  const showGcalButton = apt.status === 'confirmed' || apt.status === 'completed'

  return (
    <div className="apt-detail-page">
      <div className="container">
        {/* Back link */}
        <Link to="/mi-panel" className="apt-detail-back">
          <ArrowLeft size={16} /> Mis Citas
        </Link>

        {/* Header */}
        <div className="apt-detail-header card">
          <div className="apt-detail-header__left">
            <p className="apt-detail-header__id">#{apt.id?.slice(0, 8).toUpperCase()}</p>
            <h1 className="apt-detail-header__title">{serviceNames}</h1>
            <p className="apt-detail-header__date">{dateStr}</p>
          </div>
          <div className="apt-detail-header__right">
            <span className={`badge badge--${STATUS_CLASS[apt.status] || 'pending'} badge--lg`}>
              {STATUS_LABELS[apt.status] || apt.status}
            </span>
            {showGcalButton && (
              <a
                href={buildGcalUrl(apt, serviceNames)}
                target="_blank"
                rel="noreferrer"
                className="btn btn--secondary btn--sm apt-detail-gcal-btn"
              >
                <ExternalLink size={14} /> Agregar a Google Calendar
              </a>
            )}
          </div>
        </div>

        <div className="apt-detail-body">
          {/* Left column */}
          <div className="apt-detail-main">

            {/* Appointment info */}
            <section className="apt-detail-section card">
              <h2 className="apt-detail-section__title">
                <Calendar size={16} /> Información de la Cita
              </h2>
              <div className="apt-detail-info-grid">
                <div className="apt-detail-info-item apt-detail-info-item--full">
                  <span className="apt-detail-info-label"><Calendar size={12} /> Fecha</span>
                  <span className="apt-detail-info-value">{dateStr}</span>
                </div>
                <div className="apt-detail-info-item">
                  <span className="apt-detail-info-label"><Clock size={12} /> Hora inicio</span>
                  <span className="apt-detail-info-value">{apt.start_time?.slice(0, 5) || '—'}</span>
                </div>
                <div className="apt-detail-info-item">
                  <span className="apt-detail-info-label"><Clock size={12} /> Hora fin</span>
                  <span className="apt-detail-info-value">{apt.end_time?.slice(0, 5) || '—'}</span>
                </div>
                <div className="apt-detail-info-item apt-detail-info-item--full">
                  <span className="apt-detail-info-label"><MapPin size={12} /> Ubicación</span>
                  <span className="apt-detail-info-value">{apt.location_address || '—'}</span>
                </div>
              </div>
            </section>

            {/* Services */}
            <section className="apt-detail-section card">
              <h2 className="apt-detail-section__title">
                <Layers size={16} /> Servicios Solicitados
              </h2>
              {services.length === 0 ? (
                <p className="apt-detail-empty">No hay servicios registrados.</p>
              ) : (
                <div className="apt-detail-services">
                  {services.map((s, i) => {
                    const details = getRelevantDetails(s.services?.name, s.custom_details)
                    return (
                      <div key={i} className="apt-detail-service-item">
                        <p className="apt-detail-service-name">{s.services?.name || 'Servicio'}</p>
                        {details && details.length > 0 && (
                          <div className="apt-detail-service-details">
                            {details.map((row, j) => (
                              <span key={j} className="apt-detail-service-detail-chip">
                                <strong>{row.label}:</strong> {row.value}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            {/* Notes */}
            {apt.notes && (
              <section className="apt-detail-section card">
                <h2 className="apt-detail-section__title">
                  <FileText size={16} /> Notas
                </h2>
                <p className="apt-detail-notes">"{apt.notes}"</p>
              </section>
            )}

            {/* Media gallery */}
            {allMedia.length > 0 && (
              <section className="apt-detail-section card">
                <h2 className="apt-detail-section__title">
                  <ImageIcon size={16} /> Imágenes / Videos de Referencia ({allMedia.length})
                </h2>
                <div className="apt-detail-media-grid">
                  {allMedia.map((url, i) => (
                    isVideoUrl(url) ? (
                      <a key={i} href={url} target="_blank" rel="noreferrer" className="apt-detail-media-item">
                        <video
                          src={url}
                          autoPlay
                          loop
                          muted
                          playsInline
                          preload="metadata"
                          style={{ pointerEvents: 'none', width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </a>
                    ) : (
                      <a key={i} href={url} target="_blank" rel="noreferrer" className="apt-detail-media-item">
                        <img
                          src={url}
                          alt={`Referencia ${i + 1}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={e => {
                            // Si falla, mostramos un fallback o evitamos que se oculte por completo
                            e.target.style.opacity = 0.5
                            e.target.alt = "Imagen no soportada o cargando..."
                          }}
                        />
                      </a>
                    )
                  ))}
                </div>
              </section>
            )}

            {/* Quotation CTA */}
            {showQuotationCTA && (
              <section className="apt-detail-section card apt-detail-quotation-cta">
                <h2 className="apt-detail-section__title">
                  <FileText size={16} /> Cotización
                </h2>
                <div className="apt-detail-quotation-row">
                  <div>
                    <p className="apt-detail-quotation-status">
                      Estado: <span className={`badge badge--${quotation.status === 'accepted' ? 'completed' : quotation.status === 'rejected' ? 'cancelled' : 'pending'}`}>
                        {quotation.status === 'accepted' ? 'Aceptada' : quotation.status === 'rejected' ? 'Rechazada' : 'Pendiente de respuesta'}
                      </span>
                    </p>
                    <p className="apt-detail-quotation-total">
                      Total: <strong>${Number(quotation.total || 0).toFixed(2)}</strong>
                    </p>
                  </div>
                  <Link to={`/mi-panel/cotizaciones/${quotation.id}`} className="btn btn--primary btn--sm">
                    Ver cotización <ChevronRight size={14} />
                  </Link>
                </div>
              </section>
            )}

            {/* Payment upload */}
            {showPaymentUpload && (
              <section className="apt-detail-section card apt-detail-payment">
                <h2 className="apt-detail-section__title">
                  <Upload size={16} /> Subir Comprobante de Pago
                </h2>
                {/* 50% deposit breakdown */}
                <div className="apt-detail-deposit-info">
                  <div className="apt-detail-deposit-row">
                    <span>Abono requerido ahora (50%)</span>
                    <strong className="apt-detail-deposit-amount">${(Number(quotation?.total || 0) * 0.5).toFixed(2)}</strong>
                  </div>
                  <div className="apt-detail-deposit-row apt-detail-deposit-row--muted">
                    <span>Saldo al finalizar el servicio (50%)</span>
                    <span>${(Number(quotation?.total || 0) * 0.5).toFixed(2)}</span>
                  </div>
                  <div className="apt-detail-deposit-row apt-detail-deposit-row--total">
                    <span>Total cotizado</span>
                    <span>${Number(quotation?.total || 0).toFixed(2)}</span>
                  </div>
                </div>
                {apt.payment_proof_url ? (
                  <div className="apt-detail-payment-done">
                    <CheckCircle size={20} className="apt-detail-payment-done__icon" />
                    <span>Comprobante del 50% enviado. Estamos verificando el pago.</span>
                    <a href={apt.payment_proof_url} target="_blank" rel="noreferrer" className="btn btn--secondary btn--sm">
                      Ver comprobante
                    </a>
                  </div>
                ) : (
                  <div className="apt-detail-payment-upload">
                    <p className="apt-detail-payment-hint">
                      Adjunta la captura o PDF del pago del <strong>50% ({`$${(Number(quotation?.total || 0) * 0.5).toFixed(2)}`})</strong> para confirmar tu cita.
                    </p>
                    <label className="apt-detail-file-label">
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={e => setPaymentFile(e.target.files[0])}
                        style={{ display: 'none' }}
                      />
                      {paymentFile ? paymentFile.name : 'Seleccionar archivo (imagen o PDF)'}
                    </label>
                    <button
                      className="btn btn--primary"
                      onClick={handlePaymentUpload}
                      disabled={!paymentFile || paymentUploading}
                    >
                      {paymentUploading ? 'Enviando...' : 'Enviar comprobante'}
                    </button>
                  </div>
                )}
              </section>
            )}

            {/* Modification request */}
            {showModifyOption && (
              <section className="apt-detail-section card">
                <h2 className="apt-detail-section__title">
                  <Edit3 size={16} /> Solicitar Cambios en la Cotización
                </h2>
                {!showModifyForm ? (
                  <button className="btn btn--outline" onClick={() => setShowModifyForm(true)}>
                    Solicitar modificación
                  </button>
                ) : (
                  <div className="apt-detail-modify-form">
                    <textarea
                      className="form-input"
                      placeholder="Describe los cambios que necesitas..."
                      rows={4}
                      value={modifyNotes}
                      onChange={e => setModifyNotes(e.target.value)}
                    />
                    <div className="apt-detail-modify-actions">
                      <button className="btn btn--secondary" onClick={() => setShowModifyForm(false)}>
                        Cancelar
                      </button>
                      <button
                        className="btn btn--primary"
                        onClick={handleModifySubmit}
                        disabled={modifySubmitting}
                      >
                        {modifySubmitting ? 'Enviando...' : 'Enviar solicitud'}
                      </button>
                    </div>
                  </div>
                )}
              </section>
            )}
          </div>

          {/* Right column — Timeline */}
          <aside className="apt-detail-sidebar">
            <div className="card apt-detail-timeline">
              <h2 className="apt-detail-section__title">Estado de la Cita</h2>
              {apt.status === 'cancelled' ? (
                <div className="apt-detail-cancelled">
                  <XCircle size={32} />
                  <p>Esta cita fue cancelada.</p>
                </div>
              ) : (
                <ol className="apt-detail-timeline-list">
                  {TIMELINE_STEPS.filter(s => s.key !== 'modification_requested' || apt.status === 'modification_requested').map((step) => {
                    const stepIdx = TIMELINE_ORDER.indexOf(step.key)
                    let state = 'future'
                    if (stepIdx < currentStepIndex) state = 'past'
                    else if (stepIdx === currentStepIndex) state = 'current'
                    // modification_requested is a detour, not a linear step
                    if (step.key === 'modification_requested') state = 'current'
                    return (
                      <li key={step.key} className={`apt-detail-timeline-step apt-detail-timeline-step--${state}`}>
                        <span className="apt-detail-timeline-dot" />
                        <span className="apt-detail-timeline-label">{step.label}</span>
                      </li>
                    )
                  })}
                </ol>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
