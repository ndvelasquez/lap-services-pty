import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, ArrowLeft, ArrowRight, Upload, X, ChevronLeft, ChevronRight, Minus, Plus, Image as ImageIcon } from 'lucide-react'
import './BookingFlow.css'

const SERVICES_LIST = [
  { id: 'apt', cat: 'Limpieza de Espacios', name: 'Limpieza de Apartamento' },
  { id: 'house', cat: 'Limpieza de Espacios', name: 'Limpieza de Casa' },
  { id: 'office', cat: 'Limpieza de Espacios', name: 'Limpieza de Oficina' },
  { id: 'post', cat: 'Limpieza de Espacios', name: 'Limpieza Post-Remodelación' },
  { id: 'sofa', cat: 'Muebles', name: 'Limpieza de Sofás' },
  { id: 'mattress', cat: 'Muebles', name: 'Limpieza de Colchones' },
  { id: 'carpet', cat: 'Muebles', name: 'Limpieza de Alfombras' },
  { id: 'chairs', cat: 'Muebles', name: 'Sillas de Oficina' },
  { id: 'blinds', cat: 'Muebles', name: 'Persianas Rollers' },
  { id: 'ac-split', cat: 'Aire Acondicionado', name: 'Lavado de Split' },
  { id: 'ac-central', cat: 'Aire Acondicionado', name: 'Aire Central' },
  { id: 'ac-install', cat: 'Aire Acondicionado', name: 'Instalación de AC' },
  { id: 'auto-int', cat: 'Auto Detailing', name: 'Auto Detailing Interior' },
  { id: 'auto-full', cat: 'Auto Detailing', name: 'Lavado Completo Auto' },
  { id: 'plumbing', cat: 'Reparaciones', name: 'Plomería' },
  { id: 'electric', cat: 'Reparaciones', name: 'Electricidad' },
  { id: 'painting', cat: 'Reparaciones', name: 'Pintura General' },
]

const ROOMS = ['Sala', 'Cocina', 'Comedor', 'Dormitorio Principal', 'Dormitorio 2', 'Dormitorio 3', 'Baño Principal', 'Baño 2', 'Balcón', 'Lavandería', 'Terraza']
const FLOOR_TYPES = ['Cerámica', 'Porcelanato', 'Madera', 'Mármol', 'Vinilo', 'Granito', 'Otro']
const AC_TYPES = ['Split', 'Ventana', 'Central', 'Cassette']
const FURNITURE_MATERIALS = ['Tela', 'Cuero', 'Microfibra', 'Cuero sintético', 'Otro']

const STEP_LABELS = ['Servicios', 'Fecha y Hora', 'Detalles', 'Imágenes', 'Confirmación']

function getMonthDays(year, month) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days = []
  for (let i = 0; i < firstDay; i++) days.push(null)
  for (let i = 1; i <= daysInMonth; i++) days.push(i)
  return days
}

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const TIME_SLOTS = ['08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM']

export default function BookingFlow() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [selectedServices, setSelectedServices] = useState([])
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedTime, setSelectedTime] = useState(null)
  const [images, setImages] = useState([])
  const [notes, setNotes] = useState('')

  // Detail forms state
  const [spaceDetails, setSpaceDetails] = useState({ type: 'Apartamento', sqm: '', floor: '', rooms: [] })
  const [furnitureDetails, setFurnitureDetails] = useState({ material: '', seats: 2, pieces: 1, notes: '' })
  const [acDetails, setAcDetails] = useState({ type: 'Split', qty: 1, brand: '', btu: '12,000' })
  const [repairDetails, setRepairDetails] = useState({ description: '' })

  const toggleService = (id) => {
    setSelectedServices(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  }

  const toggleRoom = (room) => {
    setSpaceDetails(prev => ({
      ...prev,
      rooms: prev.rooms.includes(room) ? prev.rooms.filter(r => r !== room) : [...prev.rooms, room]
    }))
  }

  const unavailableDates = [5, 8, 12, 15, 22, 26]
  const unavailableSlots = ['12:00 PM', '05:00 PM']

  const isDateAvailable = (day) => {
    if (!day) return false
    const d = new Date(calYear, calMonth, day)
    return d.getDay() !== 0 && !unavailableDates.includes(day) && d >= new Date()
  }

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files)
    const newImages = files.slice(0, 10 - images.length).map(f => ({
      file: f,
      preview: URL.createObjectURL(f),
      name: f.name,
      size: (f.size / 1024 / 1024).toFixed(2)
    }))
    setImages(prev => [...prev, ...newImages])
  }

  const removeImage = (idx) => {
    URL.revokeObjectURL(images[idx].preview)
    setImages(prev => prev.filter((_, i) => i !== idx))
  }

  const handleSubmit = () => {
    // n8n integration point: POST /api/appointments
    alert('¡Solicitud enviada! recibirás tu cotización en las próximas 24 horas.')
    navigate('/mi-panel')
  }

  const groupedServices = SERVICES_LIST.reduce((acc, s) => {
    if (!acc[s.cat]) acc[s.cat] = []
    acc[s.cat].push(s)
    return acc
  }, {})

  const hasSpaceService = selectedServices.some(id => ['apt', 'house', 'office', 'post'].includes(id))
  const hasFurnitureService = selectedServices.some(id => ['sofa', 'mattress', 'carpet', 'chairs', 'blinds'].includes(id))
  const hasACService = selectedServices.some(id => ['ac-split', 'ac-central', 'ac-install'].includes(id))
  const hasRepairService = selectedServices.some(id => ['plumbing', 'electric', 'painting'].includes(id))

  const canNext = () => {
    if (step === 0) return selectedServices.length > 0
    if (step === 1) return selectedDate && selectedTime
    return true
  }

  return (
    <div className="booking-page">
      <section className="booking-hero">
        <div className="container">
          <h1>Agendar Cita</h1>
          <p>Solicita tu servicio en pocos pasos</p>
        </div>
      </section>

      <section className="section">
        <div className="container container--narrow">
          {/* Progress */}
          <div className="booking-progress">
            {STEP_LABELS.map((label, i) => (
              <div key={i} className={`progress-step ${i < step ? 'progress-step--done' : ''} ${i === step ? 'progress-step--active' : ''}`}>
                <div className="progress-step__circle">
                  {i < step ? <CheckCircle size={18} /> : i + 1}
                </div>
                <span className="progress-step__label">{label}</span>
                {i < STEP_LABELS.length - 1 && <div className="progress-step__line" />}
              </div>
            ))}
          </div>

          {/* Step 0: Services */}
          {step === 0 && (
            <div className="booking-step animate-fadeIn">
              <h2>Selecciona tus servicios</h2>
              <p className="booking-step__desc">Puedes seleccionar uno o más servicios</p>
              {Object.entries(groupedServices).map(([cat, svcs]) => (
                <div key={cat} className="service-group">
                  <h3 className="service-group__title">{cat}</h3>
                  <div className="service-group__grid">
                    {svcs.map(s => (
                      <button
                        key={s.id}
                        className={`service-option ${selectedServices.includes(s.id) ? 'service-option--selected' : ''}`}
                        onClick={() => toggleService(s.id)}
                      >
                        <div className="service-option__check">
                          {selectedServices.includes(s.id) && <CheckCircle size={18} />}
                        </div>
                        <span>{s.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 1: Calendar */}
          {step === 1 && (
            <div className="booking-step animate-fadeIn">
              <h2>Selecciona fecha y hora</h2>
              <div className="calendar-layout">
                <div className="calendar-panel">
                  <div className="calendar-header">
                    <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) } else setCalMonth(m => m - 1) }}>
                      <ChevronLeft size={20} />
                    </button>
                    <span>{MONTHS[calMonth]} {calYear}</span>
                    <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) } else setCalMonth(m => m + 1) }}>
                      <ChevronRight size={20} />
                    </button>
                  </div>
                  <div className="calendar-days">
                    {DAYS.map(d => <div key={d} className="calendar-day-name">{d}</div>)}
                    {getMonthDays(calYear, calMonth).map((day, i) => (
                      <button
                        key={i}
                        className={`calendar-day ${!day ? 'calendar-day--empty' : ''} ${day && !isDateAvailable(day) ? 'calendar-day--unavailable' : ''} ${selectedDate === day && selectedDate ? 'calendar-day--selected' : ''}`}
                        onClick={() => day && isDateAvailable(day) && setSelectedDate(day)}
                        disabled={!day || !isDateAvailable(day)}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="time-panel">
                  <h3>Horarios Disponibles</h3>
                  {selectedDate ? (
                    <>
                      <p className="time-panel__date">{DAYS[new Date(calYear, calMonth, selectedDate).getDay()]} {selectedDate} de {MONTHS[calMonth]}</p>
                      <div className="time-grid">
                        {TIME_SLOTS.map(t => (
                          <button
                            key={t}
                            className={`time-slot ${unavailableSlots.includes(t) ? 'time-slot--unavailable' : ''} ${selectedTime === t ? 'time-slot--selected' : ''}`}
                            onClick={() => !unavailableSlots.includes(t) && setSelectedTime(t)}
                            disabled={unavailableSlots.includes(t)}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="time-panel__empty">Selecciona una fecha para ver los horarios</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Details */}
          {step === 2 && (
            <div className="booking-step animate-fadeIn">
              <h2>Detalles del servicio</h2>
              <p className="booking-step__desc">Completa la información para una cotización precisa</p>

              {hasSpaceService && (
                <div className="detail-section card">
                  <h3>🏠 Limpieza de Espacio</h3>
                  <div className="detail-form">
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Tipo de espacio</label>
                        <select className="form-select" value={spaceDetails.type} onChange={e => setSpaceDetails({ ...spaceDetails, type: e.target.value })}>
                          <option>Apartamento</option><option>Casa</option><option>Oficina</option><option>Local Comercial</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Metros cuadrados</label>
                        <input type="number" className="form-input" placeholder="m²" value={spaceDetails.sqm} onChange={e => setSpaceDetails({ ...spaceDetails, sqm: e.target.value })} />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Material del piso</label>
                      <select className="form-select" value={spaceDetails.floor} onChange={e => setSpaceDetails({ ...spaceDetails, floor: e.target.value })}>
                        <option value="">Seleccionar...</option>
                        {FLOOR_TYPES.map(f => <option key={f}>{f}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Habitaciones a limpiar</label>
                      <div className="room-grid">
                        {ROOMS.map(r => (
                          <button key={r} className={`room-chip ${spaceDetails.rooms.includes(r) ? 'room-chip--selected' : ''}`} onClick={() => toggleRoom(r)}>
                            {spaceDetails.rooms.includes(r) && <CheckCircle size={14} />} {r}
                          </button>
                        ))}
                      </div>
                      {spaceDetails.rooms.length > 0 && (
                        <p className="room-count">{spaceDetails.rooms.length} habitaciones seleccionadas</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {hasFurnitureService && (
                <div className="detail-section card">
                  <h3>🛋️ Limpieza de Muebles</h3>
                  <div className="detail-form">
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Material</label>
                        <select className="form-select" value={furnitureDetails.material} onChange={e => setFurnitureDetails({ ...furnitureDetails, material: e.target.value })}>
                          <option value="">Seleccionar...</option>
                          {FURNITURE_MATERIALS.map(m => <option key={m}>{m}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Puestos</label>
                        <div className="number-stepper">
                          <button onClick={() => setFurnitureDetails(p => ({ ...p, seats: Math.max(1, p.seats - 1) }))}><Minus size={16} /></button>
                          <span>{furnitureDetails.seats}</span>
                          <button onClick={() => setFurnitureDetails(p => ({ ...p, seats: p.seats + 1 }))}><Plus size={16} /></button>
                        </div>
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Cantidad de piezas</label>
                      <div className="number-stepper">
                        <button onClick={() => setFurnitureDetails(p => ({ ...p, pieces: Math.max(1, p.pieces - 1) }))}><Minus size={16} /></button>
                        <span>{furnitureDetails.pieces}</span>
                        <button onClick={() => setFurnitureDetails(p => ({ ...p, pieces: p.pieces + 1 }))}><Plus size={16} /></button>
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Notas adicionales</label>
                      <textarea className="form-textarea" placeholder="Describe detalles adicionales..." value={furnitureDetails.notes} onChange={e => setFurnitureDetails({ ...furnitureDetails, notes: e.target.value })} />
                    </div>
                  </div>
                </div>
              )}

              {hasACService && (
                <div className="detail-section card">
                  <h3>❄️ Aire Acondicionado</h3>
                  <div className="detail-form">
                    <div className="form-group">
                      <label className="form-label">Tipo de equipo</label>
                      <div className="radio-group">
                        {AC_TYPES.map(t => (
                          <label key={t} className={`radio-option ${acDetails.type === t ? 'radio-option--selected' : ''}`}>
                            <input type="radio" name="acType" value={t} checked={acDetails.type === t} onChange={e => setAcDetails({ ...acDetails, type: e.target.value })} />
                            <span>{t}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Cantidad de equipos</label>
                        <div className="number-stepper">
                          <button onClick={() => setAcDetails(p => ({ ...p, qty: Math.max(1, p.qty - 1) }))}><Minus size={16} /></button>
                          <span>{acDetails.qty}</span>
                          <button onClick={() => setAcDetails(p => ({ ...p, qty: p.qty + 1 }))}><Plus size={16} /></button>
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Marca</label>
                        <select className="form-select" value={acDetails.brand} onChange={e => setAcDetails({ ...acDetails, brand: e.target.value })}>
                          <option value="">Seleccionar...</option>
                          <option>Samsung</option><option>LG</option><option>Carrier</option><option>Daikin</option><option>Panasonic</option><option>Otro</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Capacidad (BTU)</label>
                      <select className="form-select" value={acDetails.btu} onChange={e => setAcDetails({ ...acDetails, btu: e.target.value })}>
                        <option>9,000</option><option>12,000</option><option>18,000</option><option>24,000</option><option>36,000</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {hasRepairService && (
                <div className="detail-section card">
                  <h3>🔧 Reparaciones</h3>
                  <div className="detail-form">
                    <div className="form-group">
                      <label className="form-label">Describe el problema o trabajo necesario</label>
                      <textarea className="form-textarea" placeholder="Detalla el tipo de reparación, área afectada, etc." rows={4} value={repairDetails.description} onChange={e => setRepairDetails({ ...repairDetails, description: e.target.value })} />
                    </div>
                  </div>
                </div>
              )}

              <div className="form-group" style={{ marginTop: 'var(--space-6)' }}>
                <label className="form-label">Notas generales</label>
                <textarea className="form-textarea" placeholder="¿Algo más que debamos saber? Dirección, acceso, estacionamiento, etc." value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
            </div>
          )}

          {/* Step 3: Images */}
          {step === 3 && (
            <div className="booking-step animate-fadeIn">
              <h2>Sube imágenes de referencia</h2>
              <p className="booking-step__desc">Adjunta fotos de los espacios o artículos (máximo 10 imágenes)</p>

              <div className="upload-zone" onClick={() => document.getElementById('file-input').click()}>
                <Upload size={40} />
                <p>Arrastra tus imágenes aquí o <strong>haz clic para seleccionar</strong></p>
                <span>JPG, PNG, WEBP — Máx. 5MB por imagen</span>
                <input id="file-input" type="file" multiple accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
              </div>

              {images.length > 0 && (
                <div className="uploaded-images">
                  <p className="uploaded-count">{images.length} de 10 imágenes cargadas</p>
                  <div className="images-grid">
                    {images.map((img, i) => (
                      <div key={i} className="image-thumb">
                        <img src={img.preview} alt={img.name} />
                        <button className="image-remove" onClick={() => removeImage(i)}>
                          <X size={14} />
                        </button>
                        <div className="image-name">{img.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Confirmation */}
          {step === 4 && (
            <div className="booking-step animate-fadeIn">
              <h2>Resumen de tu Solicitud</h2>
              <div className="confirmation-card card">
                <div className="confirmation-row">
                  <span className="confirmation-label">Servicios</span>
                  <span>{selectedServices.map(id => SERVICES_LIST.find(s => s.id === id)?.name).join(', ')}</span>
                </div>
                <div className="confirmation-row">
                  <span className="confirmation-label">Fecha</span>
                  <span>{selectedDate && `${DAYS[new Date(calYear, calMonth, selectedDate).getDay()]} ${selectedDate} de ${MONTHS[calMonth]}, ${calYear}`}</span>
                </div>
                <div className="confirmation-row">
                  <span className="confirmation-label">Hora</span>
                  <span>{selectedTime}</span>
                </div>
                {hasSpaceService && (
                  <div className="confirmation-row">
                    <span className="confirmation-label">Espacio</span>
                    <span>{spaceDetails.type}, {spaceDetails.sqm || '—'}m², {spaceDetails.floor || '—'}, {spaceDetails.rooms.join(', ') || 'Sin especificar'}</span>
                  </div>
                )}
                {hasFurnitureService && (
                  <div className="confirmation-row">
                    <span className="confirmation-label">Muebles</span>
                    <span>{furnitureDetails.pieces} pieza(s), {furnitureDetails.seats} puestos, Material: {furnitureDetails.material || '—'}</span>
                  </div>
                )}
                {hasACService && (
                  <div className="confirmation-row">
                    <span className="confirmation-label">Aire Acondicionado</span>
                    <span>{acDetails.qty} equipo(s) {acDetails.type}, {acDetails.brand || '—'}, {acDetails.btu} BTU</span>
                  </div>
                )}
                {images.length > 0 && (
                  <div className="confirmation-row">
                    <span className="confirmation-label">Imágenes</span>
                    <span>{images.length} foto(s) adjuntas</span>
                  </div>
                )}
                {notes && (
                  <div className="confirmation-row">
                    <span className="confirmation-label">Notas</span>
                    <span>{notes}</span>
                  </div>
                )}
              </div>
              <p className="confirmation-note">
                Al confirmar, recibirás una cotización en las próximas 24 horas vía correo electrónico.
              </p>
            </div>
          )}

          {/* Navigation */}
          <div className="booking-nav">
            {step > 0 && (
              <button className="btn btn--secondary" onClick={() => setStep(s => s - 1)}>
                <ArrowLeft size={18} /> Anterior
              </button>
            )}
            <div style={{ flex: 1 }} />
            {step < 4 ? (
              <button className="btn btn--primary btn--lg" onClick={() => setStep(s => s + 1)} disabled={!canNext()}>
                Siguiente <ArrowRight size={18} />
              </button>
            ) : (
              <button className="btn btn--primary btn--lg" onClick={handleSubmit}>
                <CheckCircle size={18} /> Confirmar Solicitud
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
