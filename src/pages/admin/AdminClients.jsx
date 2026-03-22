import { useState } from 'react'
import { Search, Mail, Phone, Calendar } from 'lucide-react'

const clients = [
  { id: 1, name: 'María García', email: 'maria.garcia@email.com', phone: '+507 6XXX-1234', appointments: 5, lastVisit: '27 Mar 2026' },
  { id: 2, name: 'Carlos López', email: 'carlos.lopez@email.com', phone: '+507 6XXX-5678', appointments: 3, lastVisit: '25 Mar 2026' },
  { id: 3, name: 'Ana Rodríguez', email: 'ana.rodriguez@email.com', phone: '+507 6XXX-9012', appointments: 8, lastVisit: '22 Mar 2026' },
  { id: 4, name: 'Pedro Martínez', email: 'pedro.martinez@email.com', phone: '+507 6XXX-3456', appointments: 2, lastVisit: '20 Mar 2026' },
  { id: 5, name: 'Laura Sánchez', email: 'laura.sanchez@email.com', phone: '+507 6XXX-7890', appointments: 1, lastVisit: '18 Mar 2026' },
]

export default function AdminClients() {
  const [search, setSearch] = useState('')
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
        {filtered.map(c => (
          <div key={c.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--primary-gradient)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.1rem', flexShrink: 0 }}>
                {c.name[0]}
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
