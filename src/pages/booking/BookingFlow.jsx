import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, ArrowLeft, ArrowRight, Upload, X, ChevronLeft, ChevronRight, Minus, Plus, Image as ImageIcon, Video, Clock, AlertCircle, Loader } from 'lucide-react'
import { getCurrentUser, createAppointment, uploadImages, getAvailableSlots } from '../../services/api'
import { alertWarning, alertSuccess, toastError } from '../../lib/notifications'
import { compressVideo, isVideoCompressionSupported } from '../../lib/utils/videoCompressor'
import './BookingFlow.css'

const SERVICES_LIST = [
  { id: '00000000-0000-0000-0000-000000000001', cat: 'Limpieza de Espacios', name: 'Limpieza de Apartamento' },
  { id: '00000000-0000-0000-0000-000000000002', cat: 'Limpieza de Espacios', name: 'Limpieza de Casa' },
  { id: '00000000-0000-0000-0000-000000000003', cat: 'Limpieza de Espacios', name: 'Limpieza de Oficina' },
  { id: '00000000-0000-0000-0000-000000000004', cat: 'Limpieza de Espacios', name: 'Limpieza Post-Remodelación' },
  { id: '00000000-0000-0000-0000-000000000005', cat: 'Muebles', name: 'Limpieza de Sofás' },
  { id: '00000000-0000-0000-0000-000000000006', cat: 'Muebles', name: 'Limpieza de Colchones' },
  { id: '00000000-0000-0000-0000-000000000007', cat: 'Muebles', name: 'Limpieza de Alfombras' },
  { id: '00000000-0000-0000-0000-000000000008', cat: 'Muebles', name: 'Sillas de Oficina' },
  { id: '00000000-0000-0000-0000-000000000009', cat: 'Muebles', name: 'Persianas Rollers' },
  { id: '00000000-0000-0000-0000-000000000010', cat: 'Aire Acondicionado', name: 'Lavado de Split' },
  { id: '00000000-0000-0000-0000-000000000011', cat: 'Aire Acondicionado', name: 'Aire Central' },
  { id: '00000000-0000-0000-0000-000000000012', cat: 'Aire Acondicionado', name: 'Instalación de AC' },
  { id: '00000000-0000-0000-0000-000000000013', cat: 'Auto Detailing', name: 'Auto Detailing Interior' },
  { id: '00000000-0000-0000-0000-000000000014', cat: 'Auto Detailing', name: 'Lavado Completo Auto' },
  { id: '00000000-0000-0000-0000-000000000015', cat: 'Reparaciones', name: 'Plomería' },
  { id: '00000000-0000-0000-0000-000000000016', cat: 'Reparaciones', name: 'Electricidad' },
  { id: '00000000-0000-0000-0000-000000000017', cat: 'Reparaciones', name: 'Pintura General' },
]

const ROOMS = ['Sala', 'Cocina', 'Comedor', 'Dormitorio Principal', 'Dormitorio 2', 'Dormitorio 3', 'Baño Principal', 'Baño 2', 'Balcón', 'Lavandería', 'Terraza']
const FLOOR_TYPES = ['Cerámica', 'Porcelanato', 'Madera', 'Mármol', 'Vinilo', 'Granito', 'Otro']
const AC_TYPES = ['Split', 'Ventana', 'Central', 'Cassette']
const FURNITURE_MATERIALS = ['Tela', 'Cuero', 'Microfibra', 'Cuero sintético', 'Otro']

// NEW ORDER: Servicios → Detalles → Archivos → Fecha y Hora → Confirmación
const STEP_LABELS = ['Servicios', 'Detalles', 'Archivos', 'Fecha y Hora', 'Confirmación']

// Operating hours
const WORK_START_HOUR = 8  // 8:00 AM
const WORK_END_HOUR = 18   // 6:00 PM
const BUFFER_MINUTES = 60  // 1 hour buffer between appointments

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

/**
 * Estimates total service duration in minutes based on selected services and their details.
 * These are industry-standard estimates for professional cleaning services.
 */
function estimateServiceDuration(selectedServices, spaceDetails, furnitureDetails, acDetails) {
  let totalMinutes = 0

  for (const serviceId of selectedServices) {
    const service = SERVICES_LIST.find(s => s.id === serviceId)
    if (!service) continue

    switch (serviceId) {
      // Limpieza de Espacios
      case '00000000-0000-0000-0000-000000000001': { // Apartamento
        const sqm = parseFloat(spaceDetails.sqm) || 50
        totalMinutes += Math.max(120, Math.ceil(sqm * 2)) // ~2 min/m², mínimo 2h
        break
      }
      case '00000000-0000-0000-0000-000000000002': { // Casa
        const sqm = parseFloat(spaceDetails.sqm) || 80
        totalMinutes += Math.max(150, Math.ceil(sqm * 2)) // ~2 min/m², mínimo 2.5h
        break
      }
      case '00000000-0000-0000-0000-000000000003': { // Oficina
        const sqm = parseFloat(spaceDetails.sqm) || 60
        totalMinutes += Math.max(120, Math.ceil(sqm * 1.5)) // ~1.5 min/m², mínimo 2h
        break
      }
      case '00000000-0000-0000-0000-000000000004': { // Post-Remodelación
        const sqm = parseFloat(spaceDetails.sqm) || 60
        totalMinutes += Math.max(180, Math.ceil(sqm * 3)) // ~3 min/m², mínimo 3h
        break
      }
      // Muebles
      case '00000000-0000-0000-0000-000000000005': // Sofás
        totalMinutes += (furnitureDetails.seats || 2) * 30 // ~30 min/asiento
        break
      case '00000000-0000-0000-0000-000000000006': { // Colchones
        const sizeMap = { 'Twin': 45, 'Full': 60, 'Queen': 75, 'King': 90 }
        totalMinutes += sizeMap[furnitureDetails.mattressSize] || 75
        break
      }
      case '00000000-0000-0000-0000-000000000007': { // Alfombras
        const w = parseFloat(furnitureDetails.carpetWidth) || 200
        const h = parseFloat(furnitureDetails.carpetHeight) || 300
        const unit = furnitureDetails.carpetUnit
        // Convert to m² if in cm or inches
        let areaSqm
        if (unit === 'pulgadas') {
          areaSqm = (w * 0.0254) * (h * 0.0254)
        } else {
          areaSqm = (w / 100) * (h / 100) // cm to m
        }
        totalMinutes += Math.max(30, Math.ceil(areaSqm * 5)) // ~5 min/m²
        break
      }
      case '00000000-0000-0000-0000-000000000008': // Sillas de Oficina
        totalMinutes += (furnitureDetails.pieces || 1) * 15 // ~15 min/pieza
        break
      case '00000000-0000-0000-0000-000000000009': // Persianas Rollers
        totalMinutes += (furnitureDetails.pieces || 1) * 20 // ~20 min/pieza
        break
      // Aire Acondicionado
      case '00000000-0000-0000-0000-000000000010': // Split
        totalMinutes += (acDetails.qty || 1) * 60 // ~60 min/unidad
        break
      case '00000000-0000-0000-0000-000000000011': // Central
        totalMinutes += (acDetails.qty || 1) * 120 // ~120 min/unidad
        break
      case '00000000-0000-0000-0000-000000000012': // Instalación
        totalMinutes += (acDetails.qty || 1) * 180 // ~180 min/unidad
        break
      // Auto Detailing
      case '00000000-0000-0000-0000-000000000013': // Interior
        totalMinutes += 150
        break
      case '00000000-0000-0000-0000-000000000014': // Lavado Completo
        totalMinutes += 120
        break
      // Reparaciones
      case '00000000-0000-0000-0000-000000000015': // Plomería
        totalMinutes += 120
        break
      case '00000000-0000-0000-0000-000000000016': // Electricidad
        totalMinutes += 90
        break
      case '00000000-0000-0000-0000-000000000017': // Pintura
        totalMinutes += 180
        break
      default:
        totalMinutes += 60 // Fallback 1h
    }
  }

  // Minimum 60 minutes for any service combo
  return Math.max(60, totalMinutes)
}

/**
 * Formats minutes into a human-readable string like "2h 30min"
 */
function formatDuration(minutes) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}min`
}

/**
 * Converts a time string like "08:00" or "14:30" to total minutes since midnight.
 */
function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + m
}

/**
 * Converts total minutes since midnight to "HH:MM" string.
 */
function minutesToTime(mins) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * Formats "HH:MM" (24h) to "hh:MM AM/PM" for display.
 */
function formatTimeDisplay(time24) {
  const [h, m] = time24.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`
}

/**
 * Generates available time slots for a given date, considering existing appointments and buffer.
 * 
 * @param {Array} existingAppointments - Array of {start_time, end_time} from Supabase
 * @param {number} serviceDurationMinutes - Estimated duration of the new service
 * @returns {Array} Array of {time24, display, available, reason}
 */
function generateAvailableSlots(existingAppointments, serviceDurationMinutes) {
  const slots = []
  const startMinutes = WORK_START_HOUR * 60     // 480 (8:00)
  const endMinutes = WORK_END_HOUR * 60         // 1080 (18:00)

  // Parse existing appointments into minute ranges
  const occupied = existingAppointments.map(apt => ({
    start: timeToMinutes(apt.start_time),
    end: timeToMinutes(apt.end_time)
  })).sort((a, b) => a.start - b.start)

  // Generate slots every 30 minutes
  for (let slotStart = startMinutes; slotStart < endMinutes; slotStart += 30) {
    const slotEnd = slotStart + serviceDurationMinutes
    const time24 = minutesToTime(slotStart)
    const display = formatTimeDisplay(time24)

    // Check 1: Does the service fit before end of business?
    if (slotEnd > endMinutes) {
      slots.push({ time24, display, available: false, reason: 'El servicio excede el horario laboral' })
      continue
    }

    // Check 2: Overlap with any existing appointment (including buffer)
    let conflict = false
    let conflictReason = ''
    for (const apt of occupied) {
      const aptStartWithBuffer = apt.start - BUFFER_MINUTES  // Buffer before existing apt
      const aptEndWithBuffer = apt.end + BUFFER_MINUTES      // Buffer after existing apt

      // The new service window [slotStart, slotEnd] must not overlap [apt.start - buffer, apt.end + buffer]
      // More precisely:
      // - New service ends must be at or before (existing start - buffer)
      // - OR new service starts must be at or after (existing end + buffer)
      if (!(slotEnd <= aptStartWithBuffer || slotStart >= aptEndWithBuffer)) {
        conflict = true
        const aptDisplayStart = formatTimeDisplay(minutesToTime(apt.start))
        const aptDisplayEnd = formatTimeDisplay(minutesToTime(apt.end))
        conflictReason = `Conflicto con cita de ${aptDisplayStart} a ${aptDisplayEnd} (+ 1h de margen)`
        break
      }
    }

    if (conflict) {
      slots.push({ time24, display, available: false, reason: conflictReason })
    } else {
      slots.push({ time24, display, available: true, reason: '' })
    }
  }

  return slots
}


export default function BookingFlow() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [step, setStep] = useState(0)
  const [selectedServices, setSelectedServices] = useState([])
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedTime, setSelectedTime] = useState(null) // now stores 24h format "HH:MM"
  const [images, setImages] = useState([])
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [videoProgress, setVideoProgress] = useState(null)
  
  // New: availability state
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [availableSlots, setAvailableSlots] = useState([])
  const [slotsError, setSlotsError] = useState(null)

  useEffect(() => {
    getCurrentUser().then(setUser).catch(console.error)
  }, [])

  // Detail forms state
  const [spaceDetails, setSpaceDetails] = useState({ type: 'Apartamento', sqm: '', floor: '', rooms: [] })
  const [furnitureDetails, setFurnitureDetails] = useState({ material: '', seats: 2, pieces: 1, mattressSize: 'Queen', carpetWidth: '', carpetHeight: '', carpetUnit: 'cm', notes: '' })
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

  // Computed values
  const getCategoryFromId = (id) => SERVICES_LIST.find(s => s.id === id)?.cat
  const hasSpaceService = selectedServices.some(id => getCategoryFromId(id) === 'Limpieza de Espacios')
  const hasFurnitureService = selectedServices.some(id => getCategoryFromId(id) === 'Muebles')
  const hasACService = selectedServices.some(id => getCategoryFromId(id) === 'Aire Acondicionado')
  const hasRepairService = selectedServices.some(id => getCategoryFromId(id) === 'Reparaciones')
  const hasSofa = selectedServices.some(id => id === '00000000-0000-0000-0000-000000000005')
  const hasMattress = selectedServices.some(id => id === '00000000-0000-0000-0000-000000000006')
  const hasCarpet = selectedServices.some(id => id === '00000000-0000-0000-0000-000000000007')

  // Estimated duration in minutes
  const estimatedDuration = estimateServiceDuration(selectedServices, spaceDetails, furnitureDetails, acDetails)

  // Reset date/time when going back from Date step, since duration might have changed
  const handleStepChange = (newStep) => {
    // When navigating to the date/time step (3), reset time selection
    // since the available slots depend on the (possibly changed) duration
    if (newStep === 3) {
      setSelectedTime(null)
      setAvailableSlots([])
      if (selectedDate) {
        fetchSlotsForDate(selectedDate)
      }
    }
    setStep(newStep)
  }

  // Fetch slots when a date is selected
  const fetchSlotsForDate = useCallback(async (day) => {
    setLoadingSlots(true)
    setSlotsError(null)
    setSelectedTime(null)

    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    try {
      const existingApts = await getAvailableSlots(dateStr)
      const slots = generateAvailableSlots(existingApts || [], estimatedDuration)
      setAvailableSlots(slots)
    } catch (err) {
      console.error('Error fetching slots:', err)
      setSlotsError('No se pudieron cargar los horarios. Intenta de nuevo.')
      setAvailableSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }, [calYear, calMonth, estimatedDuration])

  const handleDateSelect = (day) => {
    setSelectedDate(day)
    fetchSlotsForDate(day)
  }

  const isDateAvailable = (day) => {
    if (!day) return false
    const d = new Date(calYear, calMonth, day)
    // No Sundays and must be today or future
    return d.getDay() !== 0 && d >= new Date(new Date().setHours(0, 0, 0, 0))
  }

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files)
    const remaining = 10 - images.length
    if (remaining <= 0) return
    const selected = files.slice(0, remaining)

    for (const f of selected) {
      const isVideo = f.type.startsWith('video/')
      if (isVideo) {
        if (!isVideoCompressionSupported()) {
          setImages(prev => [...prev, {
            file: f,
            preview: URL.createObjectURL(f),
            name: f.name,
            size: (f.size / 1024 / 1024).toFixed(2),
            isVideo: true
          }])
          continue
        }
        try {
          setVideoProgress(0)
          const compressed = await compressVideo(f, (p) => setVideoProgress(p))
          const compressedFile = new File([compressed], f.name.replace(/\.[^.]+$/, '.mp4'), { type: 'video/mp4' })
          setImages(prev => [...prev, {
            file: compressedFile,
            preview: URL.createObjectURL(compressedFile),
            name: compressedFile.name,
            size: (compressedFile.size / 1024 / 1024).toFixed(2),
            isVideo: true
          }])
        } catch (err) {
          console.error('Video compression failed:', err)
          toastError('No se pudo comprimir el video. Intenta con un archivo más pequeño.')
        } finally {
          setVideoProgress(null)
        }
      } else {
        setImages(prev => [...prev, {
          file: f,
          preview: URL.createObjectURL(f),
          name: f.name,
          size: (f.size / 1024 / 1024).toFixed(2),
          isVideo: false
        }])
      }
    }
  }

  const removeImage = (idx) => {
    URL.revokeObjectURL(images[idx].preview)
    setImages(prev => prev.filter((_, i) => i !== idx))
  }

  const handleSubmit = async () => {
    if (!user) {
      alertWarning('Iniciar sesión requerido', 'Debes iniciar sesión o registrarte para agendar una cita.')
      localStorage.setItem('redirectAfterLogin', '/agendar')
      navigate('/login')
      return
    }

    setLoading(true)
    try {
      // Format date as YYYY-MM-DD
      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(selectedDate).padStart(2, '0')}`

      // selectedTime is already in "HH:MM" 24h format
      const formattedTime = `${selectedTime}:00`

      const customDetails = {
        space: hasSpaceService ? spaceDetails : null,
        furniture: hasFurnitureService ? furnitureDetails : null,
        ac: hasACService ? acDetails : null,
        repair: hasRepairService ? repairDetails : null
      }

      let uploadedUrls = []
      if (images.length > 0) {
        const { urls } = await uploadImages(images.map(img => img.file))
        uploadedUrls = urls
      }

      const appData = {
        clientId: user.id,
        date: dateStr,
        time: formattedTime,
        location: user.address || 'Mi domicilio',
        notes,
        services: selectedServices,
        customDetails,
        images: uploadedUrls,
        estimatedDurationMinutes: estimatedDuration
      }

      await createAppointment(appData)
      await alertSuccess('¡Solicitud Enviada!', 'Recibirás tu cotización al correo pronto.')
      navigate('/mi-panel')
    } catch (err) {
      console.error('Error scheduling:', err)
      toastError(err.message || 'Error al agendar la cita. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  const groupedServices = SERVICES_LIST.reduce((acc, s) => {
    if (!acc[s.cat]) acc[s.cat] = []
    acc[s.cat].push(s)
    return acc
  }, {})

  const getValidationError = () => {
    if (step === 0) {
      if (selectedServices.length === 0) return 'Debes seleccionar al menos un servicio para continuar.'
    }
    if (step === 1) {
      if (hasSpaceService && !spaceDetails.sqm) return 'Ingresa los metros cuadrados del espacio a limpiar.'
      if (hasCarpet && (!furnitureDetails.carpetWidth || !furnitureDetails.carpetHeight)) return 'Ingresa las medidas de la alfombra (ancho y alto).'
      if (hasSofa && !furnitureDetails.material) return 'Selecciona el material del sofá.'
      if (hasRepairService && !repairDetails.description.trim()) return 'Describe el problema o trabajo de reparación necesario.'
    }
    if (step === 2) {
      if (images.length === 0) return 'Adjunta al menos una imagen o video de referencia para continuar.'
    }
    if (step === 3) {
      if (!selectedDate) return 'Selecciona una fecha para la cita.'
      if (!selectedTime) return 'Selecciona un horario disponible.'
    }
    return null
  }

  const handleNext = () => {
    const error = getValidationError()
    if (error) {
      toastError(error)
      return
    }
    handleStepChange(step + 1)
  }

  // Compute end time display for confirmation
  const getEndTimeDisplay = () => {
    if (!selectedTime) return ''
    const startMins = timeToMinutes(selectedTime)
    const endMins = startMins + estimatedDuration
    return formatTimeDisplay(minutesToTime(endMins))
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

          {/* Step 0: Services (unchanged) */}
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

          {/* Step 1: Details (was step 2) */}
          {step === 1 && (
            <div className="booking-step animate-fadeIn">
              <h2>Detalles del servicio</h2>
              <p className="booking-step__desc">Completa la información para una cotización precisa</p>

              {/* Duration Estimate Badge */}
              <div className="duration-badge">
                <Clock size={18} />
                <div className="duration-badge__info">
                  <span className="duration-badge__label">Duración estimada del servicio</span>
                  <span className="duration-badge__value">{formatDuration(estimatedDuration)}</span>
                </div>
              </div>

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
                    
                    {hasSofa && (
                      <div className="form-row" style={{ padding: '15px', background: '#f5f7fa', borderRadius: '8px', marginBottom: '15px' }}>
                        <div className="form-group" style={{ flex: '1 1 100%' }}><h4 style={{ margin: 0, color: 'var(--color-primary)' }}>Detalles del Sofá</h4></div>
                        <div className="form-group">
                          <label className="form-label">Material del sofá</label>
                          <select className="form-select" value={furnitureDetails.material} onChange={e => setFurnitureDetails({ ...furnitureDetails, material: e.target.value })}>
                            <option value="">Seleccionar...</option>
                            {FURNITURE_MATERIALS.map(m => <option key={m}>{m}</option>)}
                          </select>
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
                          <label className="form-label">Total de asientos/puestos</label>
                          <div className="number-stepper">
                            <button onClick={() => setFurnitureDetails(p => ({ ...p, seats: Math.max(1, p.seats - 1) }))}><Minus size={16} /></button>
                            <span>{furnitureDetails.seats}</span>
                            <button onClick={() => setFurnitureDetails(p => ({ ...p, seats: p.seats + 1 }))}><Plus size={16} /></button>
                          </div>
                        </div>
                      </div>
                    )}

                    {hasMattress && (
                      <div className="form-row" style={{ padding: '15px', background: '#f5f7fa', borderRadius: '8px', marginBottom: '15px' }}>
                        <div className="form-group" style={{ flex: '1 1 100%' }}><h4 style={{ margin: 0, color: 'var(--color-primary)' }}>Detalles del Colchón</h4></div>
                        <div className="form-group">
                          <label className="form-label">Tamaño del colchón</label>
                          <select className="form-select" value={furnitureDetails.mattressSize} onChange={e => setFurnitureDetails({ ...furnitureDetails, mattressSize: e.target.value })}>
                            <option>Twin</option><option>Full</option><option>Queen</option><option>King</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {hasCarpet && (
                      <div className="form-row" style={{ padding: '15px', background: '#f5f7fa', borderRadius: '8px', marginBottom: '15px' }}>
                        <div className="form-group" style={{ flex: '1 1 100%' }}><h4 style={{ margin: 0, color: 'var(--color-primary)' }}>Medidas de Alfombra</h4></div>
                        <div className="form-group" style={{ display: 'flex', gap: '10px' }}>
                          <input type="number" className="form-input" placeholder="Ancho" value={furnitureDetails.carpetWidth} onChange={e => setFurnitureDetails({ ...furnitureDetails, carpetWidth: e.target.value })} style={{ width: '80px' }} />
                          <span style={{ alignSelf: 'center', fontWeight: 'bold' }}>X</span>
                          <input type="number" className="form-input" placeholder="Alto" value={furnitureDetails.carpetHeight} onChange={e => setFurnitureDetails({ ...furnitureDetails, carpetHeight: e.target.value })} style={{ width: '80px' }} />
                          <select className="form-select" style={{ width: '90px' }} value={furnitureDetails.carpetUnit} onChange={e => setFurnitureDetails({ ...furnitureDetails, carpetUnit: e.target.value })}>
                            <option value="cm">cm</option>
                            <option value="pulgadas">pulg</option>
                          </select>
                        </div>
                      </div>
                    )}

                    <div className="form-group">
                      <label className="form-label">Notas adicionales (Estado de las manchas, olores, etc.)</label>
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

          {/* Step 2: Images (was step 3) */}
          {step === 2 && (
            <div className="booking-step animate-fadeIn">
              <h2>Sube fotos o videos de referencia</h2>
              <p className="booking-step__desc">Adjunta imágenes o videos de los espacios o artículos (máximo 10 archivos en total). Los videos se comprimen automáticamente.</p>

              <div
                className={`upload-zone ${videoProgress !== null ? 'upload-zone--loading' : ''}`}
                onClick={() => videoProgress === null && document.getElementById('file-input').click()}
              >
                <Upload size={40} />
                <p>Arrastra fotos o videos aquí o <strong>haz clic para seleccionar</strong></p>
                <span>Imágenes: JPG, PNG, WEBP • Videos: MP4, MOV, WEBM — máx. 10 archivos en total</span>
                <input
                  id="file-input"
                  type="file"
                  multiple
                  accept="image/*,video/mp4,video/quicktime,video/webm"
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                  disabled={videoProgress !== null}
                />
              </div>

              {videoProgress !== null && (
                <div className="video-compress-progress">
                  <Video size={16} />
                  <span>Comprimiendo video... {videoProgress}%</span>
                  <div className="video-compress-bar">
                    <div className="video-compress-bar__fill" style={{ width: `${videoProgress}%` }} />
                  </div>
                </div>
              )}

              {images.length > 0 && (
                <div className="uploaded-images">
                  <p className="uploaded-count">{images.length} de 10 archivos cargados</p>
                  <div className="images-grid">
                    {images.map((img, i) => (
                      <div key={i} className="image-thumb">
                        {img.isVideo ? (
                          <video src={img.preview} autoPlay loop muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <img src={img.preview} alt={img.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        )}
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

          {/* Step 3: Calendar + Time (was step 1) — NOW with real availability */}
          {step === 3 && (
            <div className="booking-step animate-fadeIn">
              <h2>Selecciona fecha y hora</h2>

              {/* Duration reminder */}
              <div className="duration-badge duration-badge--compact">
                <Clock size={16} />
                <span>Duración estimada: <strong>{formatDuration(estimatedDuration)}</strong></span>
              </div>

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
                        onClick={() => day && isDateAvailable(day) && handleDateSelect(day)}
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
                      
                      {loadingSlots ? (
                        <div className="slots-loading">
                          <Loader size={24} className="slots-loading__spinner" />
                          <span>Consultando disponibilidad...</span>
                        </div>
                      ) : slotsError ? (
                        <div className="slots-error">
                          <AlertCircle size={18} />
                          <span>{slotsError}</span>
                          <button className="btn btn--secondary btn--sm" onClick={() => fetchSlotsForDate(selectedDate)}>Reintentar</button>
                        </div>
                      ) : (
                        <>
                          <div className="time-grid">
                            {availableSlots.map(slot => (
                              <button
                                key={slot.time24}
                                className={`time-slot ${!slot.available ? 'time-slot--unavailable' : ''} ${selectedTime === slot.time24 ? 'time-slot--selected' : ''}`}
                                onClick={() => slot.available && setSelectedTime(slot.time24)}
                                disabled={!slot.available}
                                title={!slot.available ? slot.reason : `${slot.display} → ${formatTimeDisplay(minutesToTime(timeToMinutes(slot.time24) + estimatedDuration))}`}
                              >
                                {slot.display}
                              </button>
                            ))}
                          </div>

                          {availableSlots.length > 0 && availableSlots.every(s => !s.available) && (
                            <div className="no-slots-message">
                              <AlertCircle size={18} />
                              <p>No hay horarios disponibles para esta fecha con la duración de tu servicio ({formatDuration(estimatedDuration)}). Prueba otro día.</p>
                            </div>
                          )}

                          {selectedTime && (
                            <div className="selected-time-summary">
                              <Clock size={16} />
                              <span>
                                Tu servicio sería de <strong>{formatTimeDisplay(selectedTime)}</strong> a <strong>{getEndTimeDisplay()}</strong>
                              </span>
                            </div>
                          )}

                          <div className="slots-legend" style={{ 
                            display: 'flex', 
                            gap: '16px', 
                            marginTop: '24px', 
                            justifyContent: 'center', 
                            fontSize: '0.8rem', 
                            color: 'var(--light-500)',
                            fontWeight: 500
                          }}>
                            <div className="slots-legend__item" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <div style={{ 
                                width: '20px', 
                                height: '14px', 
                                borderRadius: '4px', 
                                border: '2px solid var(--light-300)', 
                                background: 'white' 
                              }}></div>
                              <span>Disponible</span>
                            </div>
                            <div className="slots-legend__item" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <div style={{ 
                                width: '20px', 
                                height: '14px', 
                                borderRadius: '4px', 
                                border: '2px solid transparent', 
                                background: 'var(--light-200)',
                              }}></div>
                              <span>No disponible</span>
                            </div>
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <p className="time-panel__empty">Selecciona una fecha para ver los horarios</p>
                  )}
                </div>
              </div>
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
                  <span className="confirmation-label">Duración estimada</span>
                  <span>{formatDuration(estimatedDuration)}</span>
                </div>
                <div className="confirmation-row">
                  <span className="confirmation-label">Fecha</span>
                  <span>{selectedDate && `${DAYS[new Date(calYear, calMonth, selectedDate).getDay()]} ${selectedDate} de ${MONTHS[calMonth]}, ${calYear}`}</span>
                </div>
                <div className="confirmation-row">
                  <span className="confirmation-label">Hora</span>
                  <span>{selectedTime && `${formatTimeDisplay(selectedTime)} → ${getEndTimeDisplay()}`}</span>
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
                    <span className="confirmation-label">Archivos adjuntos</span>
                    <span>{images.filter(i => !i.isVideo).length} foto(s) y {images.filter(i => i.isVideo).length} video(s)</span>
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
              <button className="btn btn--secondary" onClick={() => handleStepChange(step - 1)}>
                <ArrowLeft size={18} /> Anterior
              </button>
            )}
            <div style={{ flex: 1 }} />
            {step < 4 ? (
              <button className="btn btn--primary btn--lg" onClick={handleNext}>
                Siguiente <ArrowRight size={18} />
              </button>
            ) : (
              <button className="btn btn--primary btn--lg" onClick={handleSubmit} disabled={loading}>
                <CheckCircle size={18} /> {loading ? 'Procesando...' : 'Confirmar Solicitud'}
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
