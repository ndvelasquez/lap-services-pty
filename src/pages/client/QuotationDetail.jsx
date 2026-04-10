import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, FileText, Calendar, MapPin, Clock,
  Download, CheckCircle, XCircle, Edit3, ChevronRight
} from 'lucide-react'
import {
  getQuotationById, getCurrentUser,
  acceptQuotation, rejectQuotation, requestModification
} from '../../services/api'
import { toastSuccess, toastError, alertConfirm } from '../../lib/notifications'
import './QuotationDetail.css'

const STATUS_LABELS = {
  draft: 'Borrador',
  sent: 'Pendiente de respuesta',
  accepted: 'Aceptada',
  rejected: 'Rechazada'
}
const STATUS_CLASS = {
  draft: 'pending',
  sent: 'pending',
  accepted: 'completed',
  rejected: 'cancelled'
}

export default function QuotationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [quote, setQuote] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [modifyNotes, setModifyNotes] = useState('')
  const [showModifyForm, setShowModifyForm] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [quotation, user] = await Promise.all([getQuotationById(id), getCurrentUser()])
        if (!user) { navigate('/login'); return }
        if (quotation.client_id !== user.id) { navigate('/mi-panel'); return }
        setQuote(quotation)
      } catch (err) {
        setError('No se pudo cargar la cotización. Por favor intenta de nuevo.')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, navigate])

  async function handleAccept() {
    const confirmed = await alertConfirm(
      '¿Aceptar cotización?',
      'Al aceptar deberás subir el comprobante de pago para confirmar tu cita.',
      'Sí, aceptar'
    )
    if (!confirmed) return
    setActionLoading(true)
    try {
      await acceptQuotation(quote.id, quote.appointment_id)
      toastSuccess('Cotización aceptada. Ahora procede a subir tu comprobante de pago.')
      navigate(`/mi-panel/citas/${quote.appointment_id}`)
    } catch (err) {
      toastError('Error al aceptar la cotización. Intenta de nuevo.')
      console.error(err)
    } finally {
      setActionLoading(false)
    }
  }

  async function handleReject() {
    const confirmed = await alertConfirm(
      '¿Rechazar cotización?',
      'La cita quedará cancelada. Podrás agendar una nueva solicitud en cualquier momento.',
      'Rechazar',
      'Cancelar'
    )
    if (!confirmed) return
    setActionLoading(true)
    try {
      await rejectQuotation(quote.id, quote.appointment_id)
      toastSuccess('Cotización rechazada.')
      navigate('/mi-panel')
    } catch (err) {
      toastError('Error al rechazar la cotización. Intenta de nuevo.')
      console.error(err)
    } finally {
      setActionLoading(false)
    }
  }

  async function handleModify() {
    if (!modifyNotes.trim()) { toastError('Por favor describe los cambios que necesitas.'); return }
    const confirmed = await alertConfirm(
      '¿Solicitar modificación?',
      `Se enviará tu solicitud: "${modifyNotes}"`,
      'Enviar solicitud'
    )
    if (!confirmed) return
    setActionLoading(true)
    try {
      await requestModification(quote.appointment_id, modifyNotes)
      toastSuccess('Solicitud enviada. El equipo te contactará para ajustar la cotización.')
      setModifyNotes('')
      setShowModifyForm(false)
      navigate(`/mi-panel/citas/${quote.appointment_id}`)
    } catch (err) {
      toastError('Error al enviar la solicitud. Intenta de nuevo.')
      console.error(err)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="quot-detail-page">
        <div className="container">
          <div className="quot-detail-loading">Cargando cotización...</div>
        </div>
      </div>
    )
  }
  if (error || !quote) {
    return (
      <div className="quot-detail-page">
        <div className="container">
          <div className="card quot-detail-error">
            <p>{error || 'Cotización no encontrada.'}</p>
            <Link to="/mi-panel" className="btn btn--secondary">Volver al panel</Link>
          </div>
        </div>
      </div>
    )
  }

  const apt = quote.appointments
  const backUrl = quote.appointment_id ? `/mi-panel/citas/${quote.appointment_id}` : '/mi-panel'

  let aptDateStr = apt?.appointment_date
  if (apt?.appointment_date) {
    const [y, m, d] = apt.appointment_date.split('-')
    aptDateStr = new Date(y, m - 1, d).toLocaleDateString('es-PA', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
    })
  }
  const aptServices = apt?.appointment_services?.map(s => s.services?.name).filter(Boolean).join(', ')
  const createdDate = new Date(quote.created_at).toLocaleDateString('es-PA', {
    day: '2-digit', month: 'long', year: 'numeric'
  })

  const isSent = quote.status === 'sent'

  return (
    <div className="quot-detail-page">
      <div className="container">
        {/* Back link */}
        <Link to={backUrl} className="quot-detail-back">
          <ArrowLeft size={16} /> {quote.appointment_id ? 'Volver a la cita' : 'Mis Citas'}
        </Link>

        {/* Header */}
        <div className="quot-detail-header card">
          <div className="quot-detail-header__left">
            <p className="quot-detail-header__id">
              <FileText size={14} /> COT-{id.slice(0, 8).toUpperCase()}
            </p>
            <h1 className="quot-detail-header__title">Tu Cotización</h1>
            <p className="quot-detail-header__date">Emitida el {createdDate}</p>
          </div>
          <div className="quot-detail-header__right">
            <span className={`badge badge--${STATUS_CLASS[quote.status] || 'pending'} badge--lg`}>
              {STATUS_LABELS[quote.status] || quote.status}
            </span>
            {quote.pdf_url && (
              <a
                href={`${quote.pdf_url}?v=${quote.pdf_version || 1}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn--secondary btn--sm"
              >
                <Download size={14} /> Descargar PDF
              </a>
            )}
          </div>
        </div>

        {/* Appointment summary */}
        {apt && (
          <div className="card quot-detail-apt-summary">
            <h2 className="quot-detail-section-title">
              <Calendar size={16} /> Cita Asociada
            </h2>
            <div className="quot-detail-apt-grid">
              {aptServices && (
                <div className="quot-detail-apt-item">
                  <span className="quot-detail-apt-label">Servicios</span>
                  <span className="quot-detail-apt-value">{aptServices}</span>
                </div>
              )}
              {aptDateStr && (
                <div className="quot-detail-apt-item">
                  <span className="quot-detail-apt-label"><Calendar size={12} /> Fecha</span>
                  <span className="quot-detail-apt-value" style={{ textTransform: 'capitalize' }}>{aptDateStr}</span>
                </div>
              )}
              {apt.start_time && (
                <div className="quot-detail-apt-item">
                  <span className="quot-detail-apt-label"><Clock size={12} /> Hora</span>
                  <span className="quot-detail-apt-value">{apt.start_time.slice(0, 5)}</span>
                </div>
              )}
              {apt.location_address && (
                <div className="quot-detail-apt-item quot-detail-apt-item--full">
                  <span className="quot-detail-apt-label"><MapPin size={12} /> Ubicación</span>
                  <span className="quot-detail-apt-value">{apt.location_address}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Line items table */}
        <div className="card quot-detail-items-card">
          <h2 className="quot-detail-section-title">
            <FileText size={16} /> Detalle de Servicios
          </h2>
          <div className="quot-detail-table-wrap">
            <table className="quot-detail-table">
              <thead>
                <tr>
                  <th>Concepto</th>
                  <th>Descripción</th>
                  <th className="quot-detail-col-num">Cant.</th>
                  <th className="quot-detail-col-num">Precio Unit.</th>
                  <th className="quot-detail-col-num">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {quote.items.map((item, i) => (
                  <tr key={i}>
                    <td className="quot-detail-td-concept">{item.concept}</td>
                    <td className="quot-detail-td-desc">{item.description || '—'}</td>
                    <td className="quot-detail-col-num">{item.quantity}</td>
                    <td className="quot-detail-col-num">${Number(item.unit_price || 0).toFixed(2)}</td>
                    <td className="quot-detail-col-num">${Number(item.subtotal || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="quot-detail-tfoot-row">
                  <td colSpan={4}>Subtotal</td>
                  <td className="quot-detail-col-num">${Number(quote.subtotal || 0).toFixed(2)}</td>
                </tr>
                <tr className="quot-detail-tfoot-row">
                  <td colSpan={4}>ITBMS (7%)</td>
                  <td className="quot-detail-col-num">${Number(quote.tax || 0).toFixed(2)}</td>
                </tr>
                <tr className="quot-detail-tfoot-total">
                  <td colSpan={4}>Total</td>
                  <td className="quot-detail-col-num">${Number(quote.total || 0).toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Conditions */}
        {quote.conditions && (
          <div className="card quot-detail-conditions">
            <h2 className="quot-detail-section-title">
              <FileText size={16} /> Condiciones y Términos
            </h2>
            <blockquote className="quot-detail-conditions-text">
              {quote.conditions}
            </blockquote>
          </div>
        )}

        {/* Payment breakdown — 50/50 policy */}
        {(isSent || quote.status === 'accepted') && (
          <div className="card quot-detail-payment-info">
            <h2 className="quot-detail-section-title">
              <CheckCircle size={16} /> Política de Pago
            </h2>
            <div className="quot-detail-payment-breakdown">
              <div className="quot-detail-payment-row quot-detail-payment-row--highlight">
                <div>
                  <p className="quot-detail-payment-label">Abono inicial (50%)</p>
                  <p className="quot-detail-payment-desc">A pagar al aceptar esta cotización</p>
                </div>
                <span className="quot-detail-payment-amount">${(Number(quote.total || 0) * 0.5).toFixed(2)}</span>
              </div>
              <div className="quot-detail-payment-row">
                <div>
                  <p className="quot-detail-payment-label">Saldo restante (50%)</p>
                  <p className="quot-detail-payment-desc">A pagar al finalizar el servicio</p>
                </div>
                <span className="quot-detail-payment-amount quot-detail-payment-amount--muted">${(Number(quote.total || 0) * 0.5).toFixed(2)}</span>
              </div>
              <div className="quot-detail-payment-total">
                <span>Total cotizado</span>
                <span>${Number(quote.total || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="card quot-detail-actions">
          {isSent && (
            <>
              <div className="quot-detail-actions-primary">
                <button
                  className="btn btn--primary quot-detail-btn-accept"
                  onClick={handleAccept}
                  disabled={actionLoading}
                >
                  <CheckCircle size={16} /> {actionLoading ? 'Procesando...' : 'Aceptar y abonar 50%'}
                </button>
                <button
                  className="btn btn--danger"
                  onClick={handleReject}
                  disabled={actionLoading}
                >
                  <XCircle size={16} /> Rechazar
                </button>
              </div>

              {!showModifyForm ? (
                <button
                  className="btn btn--outline"
                  onClick={() => setShowModifyForm(true)}
                  disabled={actionLoading}
                >
                  <Edit3 size={14} /> Solicitar cambios
                </button>
              ) : (
                <div className="quot-detail-modify-form">
                  <p className="quot-detail-modify-hint">
                    Describe qué cambios necesitas en la cotización:
                  </p>
                  <textarea
                    className="form-input"
                    placeholder="Ej: Necesito agregar limpieza del balcón, cambiar la fecha..."
                    rows={4}
                    value={modifyNotes}
                    onChange={e => setModifyNotes(e.target.value)}
                  />
                  <div className="quot-detail-modify-actions">
                    <button className="btn btn--outline" onClick={() => setShowModifyForm(false)}>
                      Cancelar
                    </button>
                    <button
                      className="btn btn--primary"
                      onClick={handleModify}
                      disabled={actionLoading}
                    >
                      {actionLoading ? 'Enviando...' : 'Enviar solicitud'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {quote.status === 'accepted' && (
            <div className="quot-detail-accepted">
              <CheckCircle size={28} />
              <div>
                <p className="quot-detail-accepted-title">Cotización aceptada</p>
                <p className="quot-detail-accepted-hint">
                  Sube tu comprobante de pago para confirmar la cita.
                </p>
              </div>
              <Link
                to={`/mi-panel/citas/${quote.appointment_id}`}
                className="btn btn--primary"
              >
                Ir a pagar <ChevronRight size={14} />
              </Link>
            </div>
          )}

          {quote.status === 'rejected' && (
            <div className="quot-detail-rejected">
              <XCircle size={28} />
              <div>
                <p className="quot-detail-rejected-title">Cotización rechazada</p>
                <p className="quot-detail-rejected-hint">
                  Puedes agendar una nueva cita cuando lo desees.
                </p>
              </div>
              <Link to="/agendar" className="btn btn--secondary">
                Agendar nueva cita
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
