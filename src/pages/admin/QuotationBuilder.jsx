import { useState } from 'react'
import { Plus, Trash2, Edit3, Download, Send, Save } from 'lucide-react'
import './QuotationBuilder.css'

const clientData = {
  name: 'María García', phone: '+507 412-555-1234', email: 'maria.garcia@email.com',
  date: '27 Mar 2026, 10:00 AM',
  services: [
    { name: 'Limpieza de Apartamento', details: '85m², piso cerámico, Habitaciones: Sala, Cocina, Comedor' },
    { name: 'Lavado de Aire Acondicionado', details: '2 equipos Split Samsung, 12,000 BTU cada uno' }
  ],
  images: 4
}

const defaultItems = [
  { id: 1, concept: 'Limpieza de Apartamento', desc: 'Limpieza profunda, 85m²', qty: 1, price: 95.00 },
  { id: 2, concept: 'Habitación adicional', desc: 'Cocina (incluye desengrasado)', qty: 1, price: 25.00 },
  { id: 3, concept: 'Habitación adicional', desc: 'Comedor', qty: 1, price: 15.00 },
  { id: 4, concept: 'Lavado de AC Split', desc: 'Samsung 12,000 BTU', qty: 2, price: 45.00 },
  { id: 5, concept: 'Desplazamiento', desc: 'Traslado zona este', qty: 1, price: 10.00 },
]

export default function QuotationBuilder() {
  const [items, setItems] = useState(defaultItems)
  const [conditions, setConditions] = useState('- Precio válido por 15 días\n- Incluye materiales de limpieza\n- Horario de servicio: 10:00 AM - 2:00 PM aprox.\n- Forma de pago: 50% al confirmar, 50% al completar')
  const taxRate = 0.07

  const updateItem = (id, field, value) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, [field]: field === 'qty' || field === 'price' ? Number(value) : value } : item
    ))
  }

  const removeItem = (id) => setItems(prev => prev.filter(item => item.id !== id))
  const addItem = () => setItems(prev => [...prev, { id: Date.now(), concept: '', desc: '', qty: 1, price: 0 }])

  const subtotal = items.reduce((sum, item) => sum + (item.qty * item.price), 0)
  const tax = subtotal * taxRate
  const total = subtotal + tax

  return (
    <div className="quotation-page">
      <div className="quotation-header">
        <div>
          <h1>Constructor de Cotizaciones</h1>
          <p>Cotización Nº COT-047 — 22 de Marzo, 2026</p>
        </div>
      </div>

      <div className="quotation-layout">
        {/* Client Info */}
        <div className="quotation-client card">
          <h2>Solicitud del Cliente</h2>
          <div className="client-info">
            <div className="client-info__row"><strong>Cliente:</strong> {clientData.name}</div>
            <div className="client-info__row"><strong>Teléfono:</strong> {clientData.phone}</div>
            <div className="client-info__row"><strong>Email:</strong> {clientData.email}</div>
            <div className="client-info__row"><strong>Fecha:</strong> {clientData.date}</div>
          </div>
          <h3>Servicios Solicitados</h3>
          {clientData.services.map((s, i) => (
            <div key={i} className="client-service">
              <strong>{i + 1}. {s.name}</strong>
              <span>{s.details}</span>
            </div>
          ))}
          <div className="client-images">
            <strong>Imágenes del Cliente:</strong> {clientData.images} fotos adjuntas
          </div>
        </div>

        {/* Builder */}
        <div className="quotation-builder">
          <div className="card">
            <h2>Ítems de Cotización</h2>
            <div className="items-table">
              <div className="items-header">
                <span>Concepto</span>
                <span>Descripción</span>
                <span>Cant.</span>
                <span>Precio Unit.</span>
                <span>Subtotal</span>
                <span></span>
              </div>
              {items.map(item => (
                <div key={item.id} className="items-row">
                  <input className="form-input" value={item.concept} onChange={e => updateItem(item.id, 'concept', e.target.value)} placeholder="Concepto" />
                  <input className="form-input" value={item.desc} onChange={e => updateItem(item.id, 'desc', e.target.value)} placeholder="Descripción" />
                  <input className="form-input items-qty" type="number" value={item.qty} onChange={e => updateItem(item.id, 'qty', e.target.value)} min="1" />
                  <input className="form-input items-price" type="number" value={item.price} onChange={e => updateItem(item.id, 'price', e.target.value)} step="0.01" />
                  <span className="items-subtotal">${(item.qty * item.price).toFixed(2)}</span>
                  <button className="items-delete" onClick={() => removeItem(item.id)}><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
            <button className="btn btn--secondary btn--sm" onClick={addItem} style={{ marginTop: 'var(--space-4)' }}>
              <Plus size={16} /> Agregar Ítem
            </button>

            <div className="quotation-totals">
              <div className="totals-row"><span>Subtotal</span> <span>${subtotal.toFixed(2)}</span></div>
              <div className="totals-row"><span>ITBMS (7%)</span> <span>${tax.toFixed(2)}</span></div>
              <div className="totals-row totals-row--total"><span>Total</span> <span>${total.toFixed(2)}</span></div>
            </div>
          </div>

          <div className="card" style={{ marginTop: 'var(--space-5)' }}>
            <h3>Condiciones y Notas</h3>
            <textarea className="form-textarea" value={conditions} onChange={e => setConditions(e.target.value)} rows={5} />
          </div>

          <div className="quotation-actions">
            <button className="btn btn--secondary"><Save size={16} /> Guardar Borrador</button>
            <button className="btn btn--secondary"><Download size={16} /> Previsualizar PDF</button>
            <button className="btn btn--primary btn--lg"><Send size={16} /> Enviar al Cliente</button>
          </div>
        </div>
      </div>
    </div>
  )
}
