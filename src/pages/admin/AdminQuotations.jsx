import { useState, useEffect } from 'react'
import { Plus, Search, Eye, Download, Send, FileText, Edit3, RefreshCw, XCircle, Trash2 } from 'lucide-react'
import { getAllQuotations, regenerateQuotationPdf, sendQuotation, generateQuotationPdf, deleteQuotation } from '../../services/api'
import { Link } from 'react-router-dom'
import { alertSuccess, alertError, alertConfirm, toastSuccess, toastError } from '../../lib/notifications'
import FullscreenLoader from '../../components/FullscreenLoader'

export default function AdminQuotations() {
  const [quotations, setQuotations] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [actionLoading, setActionLoading] = useState({})
  const [pdfOverlay, setPdfOverlay] = useState({ visible: false, message: '' })

  useEffect(() => {
    async function fetchQuotations() {
      try {
        const data = await getAllQuotations()
        setQuotations(data || [])
      } catch (err) {
        console.error('Error fetching quotations', err)
      } finally {
        setLoading(false)
      }
    }
    fetchQuotations()
  }, [])

  const refreshQuotations = async () => {
    setLoading(true)
    try {
      const data = await getAllQuotations()
      setQuotations(data || [])
    } catch (err) {
      console.error('Error refreshing quotations', err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = quotations.filter(q => {
    if (!search) return true
    const s = search.toLowerCase()
    return (q.profiles?.name?.toLowerCase().includes(s) || q.id.includes(s))
  })

  const getStatusBadge = (status) => {
    const isPending = status === 'draft' || status === 'sent'
    switch (status) {
      case 'draft': 
        return <span className="badge" style={{ background: 'var(--light-400)', color: 'var(--dark-500)' }}>Borrador {isPending && '(Pendiente)'}</span>
      case 'sent': 
        return <span className="badge badge--pending">Enviada {isPending && '(Pendiente)'}</span>
      case 'accepted': 
        return <span className="badge badge--confirmed">Aceptada</span>
      case 'rejected': 
        return <span className="badge badge--cancelled">Rechazada</span>
      default: 
        return <span className="badge">{status}</span>
    }
  }

  const getPdfBadge = (q) => {
    if (q.pdf_url) {
      return (
        <span className="badge badge--confirmed" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <FileText size={12} /> Generado (v{q.pdf_version || 1})
        </span>
      )
    }
    return <span className="badge" style={{ background: 'var(--light-200)', color: 'var(--dark-400)' }}>No generado</span>
  }

  const handleRegeneratePdf = async (quoteId) => {
    const confirmed = await alertConfirm('Regenerar PDF', '¿Generar nuevo PDF? Esto sobrescribirá la versión anterior.')
    if (!confirmed) return
    
    setPdfOverlay({ visible: true, message: 'Regenerando PDF...' })
    setActionLoading(prev => ({ ...prev, [quoteId]: 'regenerating' }))
    try {
      await regenerateQuotationPdf(quoteId)
      await refreshQuotations()
      setPdfOverlay({ visible: false, message: '' })
      toastSuccess('PDF regenerado exitosamente')
    } catch (err) {
      console.error('Error regenerating PDF', err)
      setPdfOverlay({ visible: false, message: '' })
      toastError('Error al regenerar el PDF')
    } finally {
      setActionLoading(prev => ({ ...prev, [quoteId]: null }))
    }
  }

  const handleGeneratePdf = async (quoteId) => {
    setPdfOverlay({ visible: true, message: 'Generando PDF...' })
    setActionLoading(prev => ({ ...prev, [quoteId]: 'generating' }))
    try {
      await generateQuotationPdf(quoteId)
      await refreshQuotations()
      setPdfOverlay({ visible: false, message: '' })
      await alertSuccess('¡PDF Generado!', 'El documento se ha generado exitosamente.')
    } catch (err) {
      console.error('Error generating PDF', err)
      setPdfOverlay({ visible: false, message: '' })
      alertError('Error', 'No se pudo generar el PDF. Intenta nuevamente.')
    } finally {
      setActionLoading(prev => ({ ...prev, [quoteId]: null }))
    }
  }

  const handleSendQuotation = async (quoteId) => {
    const confirmed = await alertConfirm('Enviar Cotización', '¿Enviar esta cotización al cliente por correo electrónico?', 'Enviar', 'Cancelar')
    if (!confirmed) return
    
    setActionLoading(prev => ({ ...prev, [quoteId]: 'sending' }))
    try {
      await sendQuotation(quoteId)
      await refreshQuotations()
      toastSuccess('Cotización enviada al cliente')
    } catch (err) {
      console.error('Error sending quotation', err)
      toastError('Error al enviar la cotización')
    } finally {
      setActionLoading(prev => ({ ...prev, [quoteId]: null }))
    }
  }

  const handleDeleteQuotation = async (quoteId) => {
    const confirmed = await alertConfirm('Eliminar Cotización', '¿Estás seguro? Esta acción no se puede deshacer.', 'Eliminar', 'Cancelar')
    if (!confirmed) return
    
    setActionLoading(prev => ({ ...prev, [quoteId]: 'deleting' }))
    try {
      await deleteQuotation(quoteId)
      await refreshQuotations()
      toastSuccess('Cotización eliminada')
    } catch (err) {
      console.error('Error deleting quotation', err)
      toastError('Error al eliminar: ' + err.message)
    } finally {
      setActionLoading(prev => ({ ...prev, [quoteId]: null }))
    }
  }

  const handleViewPdf = (pdfUrl, pdfVersion = null) => {
    if (pdfUrl) {
      // Append version or timestamp to bypass browser cache
      const versionSuffix = pdfVersion ? `?v=${pdfVersion}` : `?t=${Date.now()}`
      window.open(`${pdfUrl}${versionSuffix}`, '_blank')
    }
  }

  const canEdit = (status) => status === 'draft' || status === 'sent'
  const canRegenerate = (status) => ['draft', 'sent'].includes(status)
  const canSend = (status) => ['draft', 'sent'].includes(status)
  const canViewPdf = (q) => q.pdf_url
  const canGeneratePdf = (q) => (q.status === 'draft' || q.status === 'sent') && !q.pdf_url

  return (
    <div style={{ padding: 'var(--space-8)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>Gestión de Cotizaciones</h1>
          <p style={{ color: 'var(--dark-400)' }}>Historial de cotizaciones emitidas a los clientes</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <button className="btn btn--secondary" onClick={refreshQuotations} disabled={loading}>
            <RefreshCw size={18} /> Actualizar
          </button>
          <Link to="/admin/cotizaciones/nueva" className="btn btn--primary">
            <Plus size={18} /> Nueva Cotización Libre
          </Link>
        </div>
      </div>

      <div style={{ position: 'relative', maxWidth: '300px', marginBottom: 'var(--space-6)' }}>
        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--dark-400)' }} />
        <input 
          className="form-input" 
          style={{ paddingLeft: '38px', width: '100%' }} 
          placeholder="Buscar por cliente o ID..." 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
        />
      </div>

      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        {loading ? (
          <p style={{ padding: '20px', textAlign: 'center' }}>Cargando cotizaciones...</p>
        ) : filtered.length === 0 ? (
          <p style={{ padding: '20px', textAlign: 'center' }}>No se encontraron cotizaciones.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: 'var(--space-4) var(--space-5)', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--dark-400)', borderBottom: '2px solid var(--light-300)' }}>ID</th>
                <th style={{ textAlign: 'left', padding: 'var(--space-4) var(--space-5)', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--dark-400)', borderBottom: '2px solid var(--light-300)' }}>Cliente</th>
                <th style={{ textAlign: 'left', padding: 'var(--space-4) var(--space-5)', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--dark-400)', borderBottom: '2px solid var(--light-300)' }}>Fecha</th>
                <th style={{ textAlign: 'left', padding: 'var(--space-4) var(--space-5)', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--dark-400)', borderBottom: '2px solid var(--light-300)' }}>Total</th>
                <th style={{ textAlign: 'left', padding: 'var(--space-4) var(--space-5)', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--dark-400)', borderBottom: '2px solid var(--light-300)' }}>PDF</th>
                <th style={{ textAlign: 'left', padding: 'var(--space-4) var(--space-5)', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--dark-400)', borderBottom: '2px solid var(--light-300)' }}>Estado</th>
                <th style={{ textAlign: 'left', padding: 'var(--space-4) var(--space-5)', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--dark-400)', borderBottom: '2px solid var(--light-300)' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(q => {
                const date = new Date(q.created_at).toLocaleDateString('es-PA', { day: '2-digit', month: 'short', year: 'numeric' })
                const isLoading = actionLoading[q.id]
                return (
                  <tr key={q.id}>
                    <td style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--light-300)' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--dark-400)' }}>
                        COT-{q.id.split('-')[0].toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--light-300)', fontWeight: 600 }}>
                      {q.profiles?.name || 'Cliente Desconocido'}
                    </td>
                    <td style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--light-300)' }}>
                      {date}
                    </td>
                    <td style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--light-300)', fontWeight: 700 }}>
                      ${(q.total || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--light-300)' }}>
                      {getPdfBadge(q)}
                    </td>
                    <td style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--light-300)' }}>
                      {getStatusBadge(q.status)}
                    </td>
                    <td style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--light-300)' }}>
                      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                        {canGeneratePdf(q) && (
                          <button 
                            className="btn btn--sm btn--primary" 
                            title="Generar PDF"
                            onClick={() => handleGeneratePdf(q.id)}
                            disabled={isLoading === 'generating'}
                          >
                            <FileText size={14} />
                          </button>
                        )}

                        {canViewPdf(q) && (
                           <button 
                            className="btn btn--secondary btn--sm" 
                            title="Ver PDF"
                            onClick={() => handleViewPdf(q.pdf_url, q.pdf_version)}
                          >
                            <FileText size={14} />
                          </button>
                        )}
                        
                        <Link 
                          to={`/admin/cotizaciones/editar?quote_id=${q.id}`} 
                          className={`btn btn--sm ${canEdit(q.status) ? 'btn--secondary' : 'btn--secondary'}`}
                          title={canEdit(q.status) ? 'Editar' : 'Solo se puede editar en estado Borrador o Enviada'}
                          style={{ opacity: canEdit(q.status) ? 1 : 0.5, pointerEvents: canEdit(q.status) ? 'auto' : 'none' }}
                        >
                          <Edit3 size={14} />
                        </Link>

                        {canRegenerate(q.status) && (
                          <button 
                            className="btn btn--sm btn--secondary" 
                            title="Regenerar PDF"
                            onClick={() => handleRegeneratePdf(q.id)}
                            disabled={isLoading === 'regenerating'}
                          >
                            <RefreshCw size={14} className={isLoading === 'regenerating' ? 'animate-spin' : ''} />
                          </button>
                        )}

                        {canSend(q.status) && (
                          <button 
                            className="btn btn--sm btn--primary" 
                            title="Enviar al Cliente"
                            onClick={() => handleSendQuotation(q.id)}
                            disabled={isLoading === 'sending'}
                          >
                            <Send size={14} />
                          </button>
                        )}

                        {q.status !== 'accepted' && (
                          <button 
                            className="btn btn--sm" 
                            style={{ backgroundColor: 'var(--error)', color: 'white' }}
                            title="Eliminar"
                            onClick={() => handleDeleteQuotation(q.id)}
                            disabled={isLoading === 'deleting'}
                          >
                            {isLoading === 'deleting' ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <FullscreenLoader
        visible={pdfOverlay.visible}
        message={pdfOverlay.message || 'Procesando...'}
        submessage="Esto puede tomar unos segundos. No cierres esta ventana."
      />
    </div>
  )
}
