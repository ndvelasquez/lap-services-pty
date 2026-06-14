import { useState, useEffect } from 'react'
import { Plus, Edit2, CheckCircle, XCircle, Trash2 } from 'lucide-react'
import { getAllServices, createService, updateService, toggleServiceActive } from '../../services/api'
import { alertWarning, toastSuccess, toastError } from '../../lib/notifications'

export default function AdminServices() {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Modal states
  const [isEditing, setIsEditing] = useState(false)
  const [currentService, setCurrentService] = useState({ name: '', active: true })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchServices()
  }, [])

  async function fetchServices() {
    setLoading(true)
    try {
       const data = await getAllServices()
       setServices(data || [])
    } catch (err) {
       console.error('Error fetching services', err)
    } finally {
       setLoading(false)
    }
  }

  const handleOpenEdit = (service = null) => {
    if (service) {
      setCurrentService(service)
    } else {
      setCurrentService({ name: '', active: true })
    }
    setIsEditing(true)
  }

  const handleSave = async () => {
    if (!currentService.name) return alertWarning('Campo requerido', 'El nombre del servicio es requerido.')
    setSaving(true)
    try {
      const payload = {
        name: currentService.name,
        active: currentService.active,
        category: currentService.category,
        base_price: currentService.base_price ? parseFloat(currentService.base_price) : 0
      }
      if (currentService.id) {
         await updateService(currentService.id, payload)
      } else {
         await createService(payload)
      }
      setIsEditing(false)
      fetchServices()
      toastSuccess(currentService.id ? 'Servicio actualizado' : 'Servicio creado')
    } catch (error) {
       console.error('Error guardando servicio:', error)
       toastError('Hubo un error al guardar el servicio')
    } finally {
       setSaving(false)
    }
  }

  const handleToggleActive = async (service) => {
     try {
       await toggleServiceActive(service)
       fetchServices()
     } catch (err) {
       console.error(err)
       toastError('No se pudo cambiar el estado del servicio')
     }
  }

  return (
    <div style={{ padding: 'var(--space-8)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>Gestión de Servicios</h1>
          <p style={{ color: 'var(--dark-400)' }}>Administra el catálogo de servicios permitidos</p>
        </div>
        <button className="btn btn--primary" onClick={() => handleOpenEdit()}>
           <Plus size={18} /> Nuevo Servicio
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        {loading ? (
           <p style={{ padding: '20px', textAlign: 'center' }}>Cargando catálogo...</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['ID Corto', 'Servicio', 'Categoría', 'Precio Base', 'Estado', 'Acciones'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: 'var(--space-4) var(--space-5)', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--dark-400)', borderBottom: '2px solid var(--light-300)', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.id}>
                  <td style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--light-300)', fontFamily: 'monospace', color: 'var(--dark-400)' }}>
                     {s.id.split('-')[0]}...
                  </td>
                  <td style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--light-300)', fontWeight: 600 }}>{s.name}</td>
                  <td style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--light-300)' }}>{s.category || 'N/A'}</td>
                  <td style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--light-300)', fontWeight: 700, color: 'var(--primary)' }}>${(s.base_price || 0).toFixed(2)}</td>
                  <td style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--light-300)' }}>
                    {s.active 
                      ? <span className="badge badge--confirmed">Activo</span>
                      : <span className="badge badge--cancelled">Inactivo</span>
                    }
                  </td>
                  <td style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--light-300)' }}>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                      <button className="btn btn--secondary btn--sm" onClick={() => handleToggleActive(s)} title={s.active ? 'Ocultar servicio' : 'Activar servicio'}>
                        {s.active ? <XCircle size={14} /> : <CheckCircle size={14} />}
                      </button>
                      <button className="btn btn--secondary btn--sm" onClick={() => handleOpenEdit(s)} title="Editar información">
                        <Edit2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {services.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ padding: '20px', textAlign: 'center' }}>No hay servicios registrados en la base de datos.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {isEditing && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
           <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
              <h2>{currentService.id ? 'Editar Servicio' : 'Nuevo Servicio'}</h2>
              <div style={{ marginTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                 <label>
                    Nombre del Servicio
                    <input className="form-input" style={{ width: '100%', marginTop: '4px' }} value={currentService.name} onChange={e => setCurrentService({...currentService, name: e.target.value})} autoFocus />
                 </label>
                 <label>
                    Categoría
                    <input className="form-input" style={{ width: '100%', marginTop: '4px' }} value={currentService.category || ''} onChange={e => setCurrentService({...currentService, category: e.target.value})} placeholder="Ej. Catálogo Base" />
                 </label>
                 <label>
                    Precio Base (USD)
                    <input type="number" step="0.01" className="form-input" style={{ width: '100%', marginTop: '4px' }} value={currentService.base_price || ''} onChange={e => setCurrentService({...currentService, base_price: e.target.value})} placeholder="0.00" />
                 </label>
                 <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={currentService.active} onChange={e => setCurrentService({...currentService, active: e.target.checked})} />
                    Disponible para clientes
                 </label>
                 
                 <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
                    <button className="btn btn--secondary" onClick={() => setIsEditing(false)} disabled={saving}>Cancelar</button>
                    <button className="btn btn--primary" onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  )
}
