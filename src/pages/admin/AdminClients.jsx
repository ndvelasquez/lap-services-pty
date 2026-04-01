import { useState, useEffect } from 'react'
import { Search, Mail, Phone, Calendar } from 'lucide-react'
import { getAllClients, getAllAppointments } from '../../services/api'

export default function AdminClients() {
  const [clients, setClients] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchClients() {
      try {
        const [clientsData, aptsData] = await Promise.all([
          getAllClients(),
          getAllAppointments()
        ])

        const formatted = clientsData.map(c => {
          const clientApts = aptsData.filter(a => a.client_id === c.id)
          const latestApt = clientApts.sort((a,b) => new Date(b.created_at) - new Date(a.created_at))[0]
          
          let lastVisit = 'Sin visitas'
          if (latestApt?.appointment_date) {
             const [y, m, d] = latestApt.appointment_date.split('-')
             const dateObj = new Date(y, m - 1, d)
             lastVisit = dateObj.toLocaleDateString('es-PA', { day: '2-digit', month: 'short', year: 'numeric' })
          }

          return {
            id: c.id,
            name: c.name || 'Sin Nombre',
            email: c.email || 'Sin correo',
            phone: c.phone || 'Sin número',
            appointments: clientApts.length,
            lastVisit
          }
        })
        setClients(formatted)
      } catch (err) {
        console.error('Error fetching clients', err)
      } finally {
        setLoading(false)
      }
    }
    fetchClients()
  }, [])

  const filtered = clients.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{ padding: 'var(--space-8)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>Gestión de Clientes</h1>
          <p style={{ color: 'var(--dark-400)' }}>{clients.length} clientes registrados</p>
        </div>
      </div>

      <div style={{ position: 'relative', maxWidth: '320px', marginBottom: 'var(--space-6)' }}>
        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--dark-400)' }} />
        <input className="form-input" style={{ paddingLeft: '38px', width: '100%' }} placeholder="Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 'var(--space-5)' }}>
        {loading ? (
           <p style={{ padding: '20px', color: '#666' }}>Cargando clientes...</p>
        ) : filtered.length === 0 ? (
           <p style={{ padding: '20px', color: '#666' }}>No se encontraron clientes.</p>
        ) : filtered.map(c => (
          <div key={c.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--primary-gradient)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.1rem', flexShrink: 0 }}>
                {c.name !== 'Sin Nombre' ? c.name[0]?.toUpperCase() : '?'}
              </div>
              <div>
                <strong style={{ fontSize: '1rem' }}>{c.name}</strong>
                <p style={{ fontSize: '0.85rem', color: 'var(--dark-400)' }}>{c.appointments} citas totales</p>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', fontSize: '0.9rem', color: 'var(--dark-400)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}><Mail size={14} color="var(--primary)" /> {c.email}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}><Phone size={14} color="var(--primary)" /> {c.phone}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}><Calendar size={14} color="var(--primary)" /> Última visita: {c.lastVisit}</span>
            </div>
            <button className="btn btn--secondary btn--sm" style={{ alignSelf: 'flex-start', marginTop: 'auto' }}>Ver Historial</button>
          </div>
        ))}
      </div>
    </div>
  )
}
