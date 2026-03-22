export default function AdminServices() {
  const services = [
    { name: 'Limpieza de Apartamento', cat: 'Espacios', price: '$80', active: true },
    { name: 'Limpieza de Casa', cat: 'Espacios', price: '$120', active: true },
    { name: 'Limpieza de Oficina', cat: 'Espacios', price: '$150', active: true },
    { name: 'Limpieza de Sofás', cat: 'Muebles', price: '$40', active: true },
    { name: 'Limpieza de Colchones', cat: 'Muebles', price: '$35', active: true },
    { name: 'Lavado de Split', cat: 'AC', price: '$45', active: true },
    { name: 'Auto Detailing Interior', cat: 'Auto', price: '$60', active: true },
    { name: 'Plomería', cat: 'Reparaciones', price: 'Cotización', active: true },
  ]

  return (
    <div style={{ padding: 'var(--space-8)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>Gestión de Servicios</h1>
          <p style={{ color: 'var(--dark-400)' }}>Administra el catálogo de servicios y precios</p>
        </div>
        <button className="btn btn--primary">+ Nuevo Servicio</button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Servicio', 'Categoría', 'Precio Base', 'Estado', 'Acciones'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: 'var(--space-4) var(--space-5)', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--dark-400)', borderBottom: '2px solid var(--light-300)', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {services.map((s, i) => (
              <tr key={i}>
                <td style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--light-300)', fontWeight: 600 }}>{s.name}</td>
                <td style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--light-300)' }}>{s.cat}</td>
                <td style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--light-300)', fontWeight: 700, color: 'var(--primary)' }}>{s.price}</td>
                <td style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--light-300)' }}>
                  <span className="badge badge--confirmed">Activo</span>
                </td>
                <td style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--light-300)' }}>
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <button className="btn btn--secondary btn--sm">Editar</button>
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
