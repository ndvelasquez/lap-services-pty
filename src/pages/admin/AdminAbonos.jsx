import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { DollarSign, CheckCircle, Clock, Wallet, RefreshCw, Eye, Check } from 'lucide-react'
import { getAdminPayments, verifyDeposit } from '../../services/api'
import { alertConfirm, toastSuccess, toastError } from '../../lib/notifications'
import './AdminAbonos.css'

const APT_STATUS_LABELS = {
  payment_uploaded: 'Pago en Revisión',
  confirmed: 'Cita Confirmada',
  completed: 'Servicio Completado',
  cancelled: 'Cancelada',
}

const PAYMENT_STATUS_LABELS = {
  pending: 'Pendiente de verificación',
  verified: 'Verificado',
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('-')
  return new Date(y, m - 1, d).toLocaleDateString('es-PA', {
    day: '2-digit', month: 'short', year: 'numeric'
  })
}

export default function AdminAbonos() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('active') // 'active' | 'completed' | 'all'

  const fetchPayments = async () => {
    setLoading(true)
    try {
      const data = await getAdminPayments()
      setPayments(data)
    } catch (err) {
      console.error('Error fetching payments', err)
      toastError('Error cargando los abonos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPayments() }, [])

  const handleVerify = async (paymentId) => {
    const confirmed = await alertConfirm(
      '¿Verificar abono?',
      'Confirma que recibiste este abono del cliente. La cita pasará a estado Confirmada.',
      'Verificar'
    )
    if (!confirmed) return
    try {
      await verifyDeposit(paymentId)
      toastSuccess('Abono verificado correctamente.')
      fetchPayments()
    } catch (err) {
      toastError('Error al verificar el abono.')
      console.error(err)
    }
  }

  // Compute stats
  const depositPayments = payments.filter(p => p.payment_type === 'deposit')
  const pendingTotal = depositPayments.filter(p => p.status === 'pending').reduce((s, p) => s + (p.amount || 0), 0)
  // Abonos en tránsito: depósitos verificados cuya cita aún no se completó
  const verifiedActiveTotal = depositPayments
    .filter(p => p.status === 'verified' && ['confirmed', 'payment_uploaded'].includes(p.appointments?.status))
    .reduce((s, p) => s + (p.amount || 0), 0)
  // Convertido a ingreso: suma de todos los pagos de citas completadas
  const completedTotal = payments
    .filter(p => p.appointments?.status === 'completed')
    .reduce((s, p) => s + (Number(p.amount) || 0), 0)

  // Filter rows — only show deposit payments (final payments are just accounting entries)
  const filtered = payments.filter(p => {
    if (p.payment_type !== 'deposit') return false
    const aptStatus = p.appointments?.status
    if (filter === 'active') return aptStatus === 'payment_uploaded' || aptStatus === 'confirmed'
    if (filter === 'completed') return aptStatus === 'completed'
    return true
  })

  // Group by appointment for better display
  const byAppointment = filtered.reduce((acc, p) => {
    const aptId = p.appointment_id
    if (!acc[aptId]) {
      acc[aptId] = { apt: p.appointments, quotation: p.quotations, payments: [] }
    }
    acc[aptId].payments.push(p)
    return acc
  }, {})
  const rows = Object.values(byAppointment)

  return (
    <div className="admin-abonos">
      {/* Header */}
      <div className="admin-abonos__header">
        <div>
          <h1>Módulo de Abonos</h1>
          <p>Gestiona los pagos del 50% inicial y el seguimiento hasta el ingreso confirmado</p>
        </div>
        <button className="btn btn--secondary btn--sm" onClick={fetchPayments}>
          <RefreshCw size={14} /> Actualizar
        </button>
      </div>

      {/* Summary cards */}
      <div className="abonos-summary">
        <div className="abonos-stat-card abonos-stat-card--orange">
          <div className="abonos-stat-card__icon"><Clock size={20} /></div>
          <div>
            <p className="abonos-stat-card__label">Por verificar</p>
            <p className="abonos-stat-card__value">${pendingTotal.toFixed(2)}</p>
            <p className="abonos-stat-card__sub">Comprobantes recibidos</p>
          </div>
        </div>
        <div className="abonos-stat-card abonos-stat-card--purple">
          <div className="abonos-stat-card__icon"><Wallet size={20} /></div>
          <div>
            <p className="abonos-stat-card__label">Abonos en tránsito</p>
            <p className="abonos-stat-card__value">${verifiedActiveTotal.toFixed(2)}</p>
            <p className="abonos-stat-card__sub">Verificados · cita pendiente</p>
          </div>
        </div>
        <div className="abonos-stat-card abonos-stat-card--green">
          <div className="abonos-stat-card__icon"><DollarSign size={20} /></div>
          <div>
            <p className="abonos-stat-card__label">Convertido a ingreso</p>
            <p className="abonos-stat-card__value">${completedTotal.toFixed(2)}</p>
            <p className="abonos-stat-card__sub">Servicios completados</p>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="abonos-filters">
        {[
          { key: 'active',    label: 'Activos (en tránsito)' },
          { key: 'completed', label: 'Convertidos a ingreso' },
          { key: 'all',       label: 'Todos' },
        ].map(f => (
          <button
            key={f.key}
            className={`filter-chip ${filter === f.key ? 'filter-chip--active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Info banner explaining the logic */}
      {filter === 'active' && (
        <div className="abonos-info-banner">
          <Wallet size={16} />
          <span>
            Los abonos activos son pagos del <strong>50% inicial</strong> recibidos de clientes cuyo servicio aún no se ha completado.
            Una vez el servicio sea marcado como <strong>Completado</strong>, el 50% restante se asume recibido y el total pasa a <em>Ingresos Confirmados</em>.
          </span>
        </div>
      )}

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--dark-400)' }}>Cargando abonos...</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--dark-400)' }}>
            No hay abonos en esta categoría.
          </div>
        ) : (
          <table className="abonos-table" style={{ minWidth: '780px' }}>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Servicio</th>
                <th>Fecha Cita</th>
                <th>Total Cotiz.</th>
                <th>Abono (50%)</th>
                <th>Saldo (50%)</th>
                <th>Estado Cita</th>
                <th>Estado Abono</th>
                <th>Comprobante</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ apt, quotation, payments: pmts }, i) => {
                const deposit = pmts.find(p => p.payment_type === 'deposit')
                const client = apt?.profiles
                const services = apt?.appointment_services?.map(s => s.services?.name).filter(Boolean).join(', ') || '—'
                const quotTotal = quotation?.total || 0
                const depositAmt = deposit?.amount || (quotTotal * 0.5)
                const remaining = quotTotal - depositAmt
                const aptStatus = apt?.status
                const isCompleted = aptStatus === 'completed'

                return (
                  <tr key={i}>
                    <td className="abonos-td-bold">{client?.name || '—'}</td>
                    <td className="abonos-td-service">{services}</td>
                    <td>{formatDate(apt?.appointment_date)}</td>
                    <td className="abonos-td-money">${quotTotal.toFixed(2)}</td>
                    <td className="abonos-td-money abonos-td-money--deposit">${depositAmt.toFixed(2)}</td>
                    <td className="abonos-td-money" style={{ color: isCompleted ? 'var(--success, #4CAF50)' : 'var(--dark-500)' }}>
                      {isCompleted ? <span title="Asumido al completar el servicio">✓ ${remaining.toFixed(2)}</span> : `$${remaining.toFixed(2)}`}
                    </td>
                    <td>
                      <span className={`badge badge--${aptStatus === 'completed' ? 'completed' : aptStatus === 'confirmed' ? 'confirmed' : 'pending'}`}>
                        {APT_STATUS_LABELS[aptStatus] || aptStatus}
                      </span>
                    </td>
                    <td>
                      {deposit ? (
                        <span className={`badge badge--${deposit.status === 'verified' ? 'completed' : 'pending'}`}>
                          {PAYMENT_STATUS_LABELS[deposit.status] || deposit.status}
                        </span>
                      ) : <span className="badge badge--pending">Sin abono</span>}
                    </td>
                    <td>
                      {deposit?.proof_url ? (
                        <a href={deposit.proof_url} target="_blank" rel="noreferrer" className="btn btn--secondary btn--sm">
                          <Eye size={12} /> Ver
                        </a>
                      ) : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        {deposit && deposit.status === 'pending' && (
                          <button
                            className="btn btn--primary btn--sm"
                            onClick={() => handleVerify(deposit.id)}
                            title="Verificar abono"
                          >
                            <Check size={14} /> Verificar
                          </button>
                        )}
                        {deposit && deposit.status === 'verified' && !isCompleted && (
                          <span style={{ fontSize: '0.78rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle size={14} /> Verificado
                          </span>
                        )}
                        <Link to={`/admin/citas`} className="btn btn--secondary btn--sm" title="Ver cita">
                          <Eye size={12} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Legend */}
      <div className="abonos-legend">
        <p><strong>Flujo de pagos:</strong></p>
        <div className="abonos-legend-steps">
          <span className="abonos-legend-step">① Cliente acepta cotización</span>
          <span className="abonos-legend-arrow">→</span>
          <span className="abonos-legend-step">② Sube comprobante del 50%</span>
          <span className="abonos-legend-arrow">→</span>
          <span className="abonos-legend-step">③ Admin verifica abono</span>
          <span className="abonos-legend-arrow">→</span>
          <span className="abonos-legend-step">④ Servicio completado → 50% restante asumido</span>
          <span className="abonos-legend-arrow">→</span>
          <span className="abonos-legend-step abonos-legend-step--final">✓ 100% = Ingreso confirmado</span>
        </div>
      </div>
    </div>
  )
}
