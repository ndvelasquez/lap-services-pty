import { useState } from 'react'
import { Search, Filter, ChevronRight, Check, X as XIcon, Clock, Eye } from 'lucide-react'

const appointments = [
  { id: 1, client: 'María García', service: 'Limpieza de Apartamento', date: '27 Mar 2026', time: '10:00 AM', status: 'pending' },
  { id: 2, client: 'Carlos López', service: 'Lavado de AC (x3)', date: '27 Mar 2026', time: '02:00 PM', status: 'confirmed' },
  { id: 3, client: 'Ana Rodríguez', service: 'Limpieza de Muebles', date: '28 Mar 2026', time: '09:00 AM', status: 'pending' },
  { id: 4, client: 'Pedro Martínez', service: 'Reparación plomería', date: '29 Mar 2026', time: '11:00 AM', status: 'confirmed' },
  { id: 5, client: 'Laura Sánchez', service: 'Auto Detailing Interior', date: '30 Mar 2026', time: '08:00 AM', status: 'pending' },
  { id: 6, client: 'José Hernández', service: 'Limpieza de Oficina', date: '30 Mar 2026', time: '01:00 PM', status: 'completed' },
]

const statusLabels = { confirmed: 'Confirmada', pending: 'Pendiente', completed: 'Completada', cancelled: 'Cancelada' }
const statusClass = { confirmed: 'confirmed', pending: 'pending', completed: 'completed', cancelled: 'cancelled' }

export default function AdminAppointments() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const filtered = appointments.filter(a => {
    const matchSearch = !search || a.client.toLowerCase().includes(search.toLowerCase()) || a.service.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || a.status === filter
    return matchSearch && matchFilter
  })

  return (
    <div style={{ padding: 'var(--space-8)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>Gestión de Citas</h1>
          <p style={{ color: 'var(--dark-400)' }}>Administra todas las solicitudes de citas</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-6)', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '320px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--dark-400)' }} />
          <input className="form-input" style={{ paddingLeft: '38px', width: '100%' }} placeholder="Buscar cliente o servicio..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {['all', 'pending', 'confirmed', 'completed'].map(f => (
          <button key={f} className={`filter-chip ${filter === f ? 'filter-chip--active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? 'Todas' : statusLabels[f]}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: 'var(--space-4) var(--space-5)', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--dark-400)', borderBottom: '2px solid var(--light-300)', letterSpacing: '0.05em' }}>Cliente</th>
              <th style={{ textAlign: 'left', padding: 'var(--space-4) var(--space-5)', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--dark-400)', borderBottom: '2px solid var(--light-300)' }}>Servicio</th>
              <th style={{ textAlign: 'left', padding: 'var(--space-4) var(--space-5)', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--dark-400)', borderBottom: '2px solid var(--light-300)' }}>Fecha</th>
              <th style={{ textAlign: 'left', padding: 'var(--space-4) var(--space-5)', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--dark-400)', borderBottom: '2px solid var(--light-300)' }}>Hora</th>
              <th style={{ textAlign: 'left', padding: 'var(--space-4) var(--space-5)', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--dark-400)', borderBottom: '2px solid var(--light-300)' }}>Estado</th>
              <th style={{ textAlign: 'left', padding: 'var(--space-4) var(--space-5)', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--dark-400)', borderBottom: '2px solid var(--light-300)' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(a => (
              <tr key={a.id}>
                <td style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--light-300)', fontWeight: 600 }}>{a.client}</td>
                <td style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--light-300)' }}>{a.service}</td>
                <td style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--light-300)' }}>{a.date}</td>
                <td style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--light-300)' }}>{a.time}</td>
                <td style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--light-300)' }}>
                  <span className={`badge badge--${statusClass[a.status]}`}>{statusLabels[a.status]}</span>
                </td>
                <td style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--light-300)' }}>
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    {a.status === 'pending' && (
                      <>
                        <button className="btn btn--primary btn--sm" title="Aceptar"><Check size={14} /></button>
                        <button className="btn btn--danger btn--sm" title="Rechazar"><XIcon size={14} /></button>
                      </>
                    )}
                    <button className="btn btn--secondary btn--sm" title="Ver detalles"><Eye size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
