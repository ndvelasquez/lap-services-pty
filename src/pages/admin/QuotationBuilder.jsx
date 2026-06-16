import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Plus, Trash2, Edit3, Download, Send, Save, Eye, XCircle, FileText, AlertCircle } from 'lucide-react'
import { getAllAppointments, getAppointment, createQuotation, updateQuotation, getQuotationById, generateQuotationPdf, updateAppointment } from '../../services/api'
import { formatServiceDetails, extractServiceMetadata } from '../../lib/utils/formatters'
import { alertSuccess, alertError, alertWarning } from '../../lib/notifications'
import FullscreenLoader from '../../components/FullscreenLoader'
import './QuotationBuilder.css'

// Robust ID generator fallback for environments where crypto.randomUUID is not available
const generateId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `item-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
};

export default function QuotationBuilder() {
  const [searchParams] = useSearchParams()
  const appointmentId = searchParams.get('appointment_id')
  const quoteId = searchParams.get('quote_id')
  const navigate = useNavigate()

  const [loading, setLoading] = useState(!!appointmentId || !!quoteId)
  const [error, setError] = useState(null)
  const editMode = !!quoteId
  const [clientData, setClientData] = useState(null)
  const [serviceDetailsModal, setServiceDetailsModal] = useState(null)
  const [currentQuoteId, setCurrentQuoteId] = useState(quoteId || null)
  const [pdfLoading, setPdfLoading] = useState(false)
  
  const [appointment, setAppointment] = useState(null)
  
  const [items, setItems] = useState([])
  const [conditions, setConditions] = useState('- Precio válido por 15 días\n- Incluye materiales de limpieza\n- Horario de servicio: 10:00 AM - 2:00 PM aprox.\n- Forma de pago: 50% al confirmar, 50% al completar')
  const taxRate = 0.07

  const loadInitialData = useCallback(async () => {
    if (!appointmentId && !quoteId) return
    setLoading(true)
    setError(null)
    
    try {
      if (quoteId) {
        const quote = await getQuotationById(quoteId)
        if (!quote) {
          throw new Error('No se encontró la cotización especificada.')
        }

        setClientData({
          id: quote.client_id,
          name: quote.profiles?.name || 'Cliente sin nombre',
          phone: quote.profiles?.phone || 'Sin teléfono',
          email: quote.profiles?.email || 'Sin email',
          date: quote.appointments?.appointment_date 
            ? `${quote.appointments.appointment_date} ${quote.appointments.start_time || ''}`.trim() 
            : 'Sin fecha',
          address: quote.appointments?.location_address || 'Sin dirección',
          services: quote.appointments?.appointment_services?.map(s => ({
            name: s.services?.name || 'Servicio',
            details: s.custom_details || {}
          })) || []
        })
        setConditions(quote.conditions || '')
        
        // Defensive items mapping
        const mappedItems = (quote.items || []).map((item) => ({
          id: generateId(),
          concept: item.concept || '',
          desc: item.description || '',
          qty: item.quantity || 1,
          price: item.unit_price || 0
        }))
        setItems(mappedItems)
        setCurrentQuoteId(quoteId)
      } else if (appointmentId) {
        const apt = await getAppointment(appointmentId)
        if (!apt) {
          throw new Error('No se encontró la cita base especificada.')
        }

        setAppointment(apt)
        setClientData({
          id: apt.client_id,
          name: apt.profiles?.name || 'Cliente sin nombre',
          phone: apt.profiles?.phone || 'Sin télefono',
          email: apt.profiles?.email || 'Sin email',
          date: (apt.appointment_date || '') + ' ' + (apt.start_time || ''),
          address: (apt.location && apt.location !== 'Mi domicilio') ? apt.location : (apt.profiles?.address || apt.location || 'Mi domicilio'),
          notes: apt.notes || 'Sin notas adicionales',
          services: (apt.appointment_services || []).map(s => ({
            name: s.services?.name || 'Servicio',
            details: s.custom_details || {}
          }))
        })
        
        // Populate items from appointment services if empty
        if (apt.appointment_services?.length > 0) {
           const initialItems = apt.appointment_services.map(s => {
              let descChunks = []
              const d = s.custom_details
              if (d) {
                const svcName = (s.services?.name || '').toLowerCase()
                const fur = d.furniture
                if (svcName.includes('alfombra')) {
                  if (fur?.carpetWidth && fur?.carpetHeight) {
                    const unit = fur?.carpetUnit === 'cm' ? 'cm' : 'pulgadas'
                    descChunks.push(`${fur.carpetWidth} x ${fur.carpetHeight} ${unit}`)
                  }
                } else if (svcName.includes('colchon')) {
                  if (fur?.mattressSize) descChunks.push(`Tamaño: ${fur.mattressSize}`)
                } else if (svcName.includes('sofá') || svcName.includes('silla') || svcName.includes('mueble')) {
                  if (fur?.material) descChunks.push(`Material: ${fur.material}`)
                  if (fur?.pieces) descChunks.push(`${fur.pieces} pieza(s)`)
                  if (fur?.seats) descChunks.push(`${fur.seats} puestos`)
                } else if (d.space?.metros_cuadrados) {
                  descChunks.push(`${d.space.metros_cuadrados}m²`)
                } else if (d.ac) {
                  if (d.ac.type) descChunks.push(`Tipo: ${d.ac.type}`)
                  if (d.ac.btu) descChunks.push(`${d.ac.btu} BTU`)
                }
              }
              return {
                id: generateId(),
                concept: s.services?.name || 'Servicio',
                desc: descChunks.length > 0 ? descChunks.join(', ') : 'A convenir según detalles',
                qty: 1,
                price: s.services?.base_price || 0
              }
           })
           setItems(initialItems)
        } else if (apt.service_details) {
          setItems([{
            id: generateId(),
            concept: apt.service_details.name,
            desc: 'Servicio base',
            qty: 1,
            price: apt.service_details.base_price || 0
          }])
        }
      }
    } catch (err) {
      console.error('Error loading initial data:', err)
      setError('Error al cargar datos: ' + (err.message || 'Desconocido'))
    } finally {
      setLoading(false)
    }
  }, [appointmentId, quoteId])

  useEffect(() => {
    loadInitialData()
  }, [loadInitialData])

  const updateItem = (id, field, value) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, [field]: field === 'qty' || field === 'price' ? Number(value) : value } : item
    ))
  }

  const removeItem = (id) => setItems(prev => prev.filter(item => item.id !== id))
  const addItem = () => setItems(prev => [...prev, { id: generateId(), concept: '', desc: '', qty: 1, price: 0 }])

  const subtotal = items.reduce((sum, item) => sum + (item.qty * item.price), 0)
  const tax = subtotal * taxRate
  const total = subtotal + tax

  const handleCreateQuotation = async (shouldGeneratePdf = false) => {
     if (!clientData) return alertWarning('Cita base requerida', 'Debes seleccionar una cita base primero.')
     if (items.length === 0) return alertWarning('Sin ítems', 'Debes agregar al menos un ítem a la cotización.')

     // Show fullscreen loader for PDF generation
     if (shouldGeneratePdf) setPdfLoading(true)

     try {
        let createdQuoteId = currentQuoteId

        if (editMode && currentQuoteId) {
           await updateQuotation(currentQuoteId, {
              items: items.map(i => ({ concept: i.concept, description: i.desc, quantity: i.qty, unitPrice: i.price })),
              conditions,
              subtotal,
              tax,
              total
           })
        } else {
           if (!appointmentId) {
             setPdfLoading(false)
             return alertWarning('Cita base requerida', 'Debes seleccionar una cita base primero.')
           }
           const quote = await createQuotation({
              appointmentId,
              clientId: clientData.id,
              items: items.map(i => ({ concept: i.concept, description: i.desc, quantity: i.qty, unitPrice: i.price })),
              conditions,
              taxRate
           })
           createdQuoteId = quote.id
           setCurrentQuoteId(createdQuoteId)
        }

        const finalQuoteId = editMode ? currentQuoteId : createdQuoteId

        if (shouldGeneratePdf) {
           // PDF generation is a separate concern — the quotation is already saved.
           // If PDF generation fails we still show success for the save and warn about the PDF.
           try {
             await generateQuotationPdf(finalQuoteId)
             setPdfLoading(false)
             await alertSuccess('¡PDF Generado!', 'El documento PDF de la cotización se ha generado exitosamente. Puedes verlo desde la lista de cotizaciones.')
           } catch (pdfErr) {
             setPdfLoading(false)
             console.warn('PDF generation failed, but quotation was saved:', pdfErr)
             const isAuthError = pdfErr?.message?.includes('401') || pdfErr?.message?.toLowerCase()?.includes('unauthorized')
             const errorDetail = isAuthError
               ? 'Tu sesión puede haber expirado. Intenta cerrar sesión y volver a entrar, luego regenera el PDF desde la lista de cotizaciones.'
               : 'La generación del PDF falló temporalmente. Puedes reintentarla desde la lista de cotizaciones.'
             await alertWarning(
               'Cotización Guardada (PDF pendiente)',
               `La cotización fue guardada exitosamente. ${errorDetail}`
             )
           }
        } else {
           setPdfLoading(false)
           await alertSuccess('Cotización Guardada', 'La cotización ha sido guardada como borrador.')
        }

        navigate('/admin/cotizaciones')
     } catch (err) {
        console.error('Error processing quotation', err)
        setPdfLoading(false)
        alertError('Error al procesar', 'Hubo un error al guardar la cotización. Por favor intenta nuevamente.')
     }
  }

  if (loading) return (
    <div className="quotation-loading">
      <div className="spinner"></div>
      <p>{editMode ? 'Cargando cotización...' : 'Cargando datos de la cita...'}</p>
    </div>
  )

  if (error) return (
    <div className="quotation-error-state card">
      <AlertCircle size={48} color="var(--error-500)" />
      <h2>Error al cargar datos</h2>
      <p>{error}</p>
      <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
        <button className="btn btn--secondary" onClick={() => navigate('/admin/cotizaciones')}>
          Volver a Cotizaciones
        </button>
        <button className="btn btn--primary" onClick={loadInitialData}>
          Reintentar
        </button>
      </div>
    </div>
  )

  return (
    <div className="quotation-page">
      <div className="quotation-header">
        <div>
          <h1>{editMode ? 'Editar Cotización' : 'Constructor de Cotizaciones'}</h1>
          <p>{editMode ? 'Modificando cotización existente' : 'Creando cotización para solicitud pendiente'}</p>
        </div>
      </div>

      <div className="quotation-layout">
        <div className="quotation-client card">
          <h2>Solicitud del Cliente</h2>
          {clientData ? (
             <>
                <div className="client-info">
                  <div className="client-info__row"><strong>Cliente:</strong> {clientData.name}</div>
                  <div className="client-info__row"><strong>Teléfono:</strong> {clientData.phone}</div>
                  <div className="client-info__row"><strong>Email:</strong> {clientData.email}</div>
                  <div className="client-info__row"><strong>Fecha Solicitada:</strong> {clientData.date}</div>
                  <div className="client-info__row"><strong>Dirección:</strong> {clientData.address}</div>
                </div>
                <h3>Servicios Solicitados</h3>
                {clientData.services.length > 0 ? (
                  clientData.services.map((s, i) => {
                    const entries = extractServiceMetadata(s.name, s.details)
                    
                    return (
                      <div key={i} className="client-service" style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <strong>{i + 1}. {s.name}</strong>
                          {entries.length > 0 && (
                            <button 
                              className="btn btn--secondary btn--sm" 
                              style={{ padding: '0.2rem 0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                              onClick={() => setServiceDetailsModal({ name: s.name, entries })}
                            >
                              <Eye size={14} /> Detalles
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <p className="text-muted">No hay servicios detallados en esta cita.</p>
                )}
             </>
          ) : (
             <p>No se cargó ninguna cita. Por favor ingresa desde la lista de Citas buscando la solicitud deseada.</p>
          )}
        </div>

        <div className="quotation-builder">
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>Ítems de Cotización</h2>
              <button className="btn btn--secondary btn--sm" onClick={addItem}>
                <Plus size={16} /> Agregar Ítem
              </button>
            </div>
            
            <div className="items-table">
              <div className="items-header">
                <span>Concepto</span>
                <span>Descripción</span>
                <span>Cant.</span>
                <span>Precio Unit.</span>
                <span>Subtotal</span>
                <span></span>
              </div>
              {items.length > 0 ? (
                items.map(item => (
                  <div key={item.id} className="items-row">
                    <input className="form-input" value={item.concept} onChange={e => updateItem(item.id, 'concept', e.target.value)} placeholder="Concepto" />
                    <input className="form-input" value={item.desc} onChange={e => updateItem(item.id, 'desc', e.target.value)} placeholder="Descripción" />
                    <input className="form-input items-qty" type="number" value={item.qty} onChange={e => updateItem(item.id, 'qty', e.target.value)} min="1" />
                    <input className="form-input items-price" type="number" value={item.price} onChange={e => updateItem(item.id, 'price', e.target.value)} step="0.01" placeholder="Precio" />
                    <span className="items-subtotal">${(item.qty * item.price).toFixed(2)}</span>
                    <button className="items-delete" onClick={() => removeItem(item.id)} title="Eliminar ítem"><Trash2 size={16} /></button>
                  </div>
                ))
              ) : (
                <div className="empty-items-state">
                  <p>No has agregado ítems a la cotización todavía.</p>
                </div>
              )}
            </div>

            <div className="quotation-totals">
              <div className="totals-row"><span data-testid="subtotal-label">Subtotal</span> <span data-testid="subtotal-value">{`$${subtotal.toFixed(2)}`}</span></div>
              <div className="totals-row"><span data-testid="tax-label">ITBMS (7%)</span> <span data-testid="tax-value">{`$${tax.toFixed(2)}`}</span></div>
              <div className="totals-row totals-row--total"><span data-testid="total-label">Total</span> <span data-testid="total-value">{`$${total.toFixed(2)}`}</span></div>
            </div>
          </div>

          <div className="card" style={{ marginTop: 'var(--space-5)' }}>
            <h3>Condiciones y Notas</h3>
            <textarea className="form-textarea" value={conditions} onChange={e => setConditions(e.target.value)} rows={5} placeholder="Escribe las condiciones comerciales aquí..." />
          </div>

          <div className="quotation-actions">
            <button className="btn btn--secondary btn--lg" onClick={() => handleCreateQuotation(false)} disabled={!clientData || items.length === 0}>
               <Save size={16} /> {editMode ? 'Guardar Cambios' : 'Crear Cotización (Borrador)'}
            </button>
            <button className="btn btn--primary btn--lg" onClick={() => handleCreateQuotation(true)} disabled={!clientData || items.length === 0}>
               <FileText size={16} /> {editMode ? 'Guardar y Regenerar PDF' : 'Guardar y Generar PDF'}
            </button>
          </div>
        </div>
      </div>

      {serviceDetailsModal && (
        <div className="modal-overlay" onClick={() => setServiceDetailsModal(null)} style={{ 
          display: 'flex', 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: '100%', 
          height: '100%', 
          backgroundColor: 'rgba(15, 23, 42, 0.7)', 
          backdropFilter: 'blur(4px)',
          zIndex: 1000, 
          justifyContent: 'center', 
          alignItems: 'center',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ 
            backgroundColor: 'white', 
            padding: 'var(--space-8)', 
            borderRadius: 'var(--radius-xl)', 
            width: '95%', 
            maxWidth: '450px', 
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            position: 'relative',
            border: '1px solid var(--light-300)'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: 'var(--space-6)',
              borderBottom: '1px solid var(--light-200)',
              paddingBottom: 'var(--space-4)'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--dark-800)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText className="text-primary-500" size={20} /> Detalles del Servicio
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: 'var(--dark-400)' }}>{serviceDetailsModal.name}</p>
              </div>
              <button 
                className="btn btn--icon" 
                onClick={() => setServiceDetailsModal(null)}
                style={{ borderRadius: '50%', backgroundColor: 'var(--light-100)' }}
              >
                <XCircle size={24} color="var(--dark-400)" />
              </button>
            </div>
            
            <div style={{ 
              backgroundColor: 'var(--light-50)', 
              borderRadius: 'var(--radius-lg)', 
              padding: 'var(--space-5)',
              border: '1px solid var(--light-200)'
            }}>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {serviceDetailsModal.entries.filter(e => e.k !== 'Unidad').map(({k, v}, idx) => (
                  <li key={idx} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    padding: 'var(--space-3) 0',
                    borderBottom: idx === serviceDetailsModal.entries.length - 1 ? 'none' : '1px solid var(--light-200)'
                  }}>
                    <span style={{ color: 'var(--dark-400)', fontSize: '0.9rem', fontWeight: 500 }}>{k}</span>
                    <span style={{ color: 'var(--dark-800)', fontSize: '0.95rem', fontWeight: 600 }}>
                      {typeof v === 'boolean' ? (v ? 'Sí' : 'No') : String(v)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div style={{ marginTop: 'var(--space-8)', display: 'flex', justifyContent: 'flex-end' }}>
               <button 
                className="btn btn--secondary" 
                onClick={() => setServiceDetailsModal(null)}
                style={{ width: '100%' }}
               >
                 Cerrar Detalles
               </button>
            </div>
          </div>
        </div>
      )}

      <FullscreenLoader
        visible={pdfLoading}
        message="Generando PDF..."
        submessage="Esto puede tomar unos segundos. Por favor espera mientras se genera el documento."
      />
    </div>
  )
}
