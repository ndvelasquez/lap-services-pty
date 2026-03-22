export default function QuotationDetail() {
  return (
    <div style={{ paddingTop: '100px', paddingBottom: '80px' }}>
      <div className="container">
        <h1 style={{ marginBottom: '2rem' }}>Detalle de Cotización</h1>
        <div className="card" style={{ padding: '2rem' }}>
          <p style={{ color: 'var(--dark-400)' }}>Aquí se mostrará el detalle completo de la cotización. Se podrá aceptar/rechazar y descargar PDF. Se conectará con n8n.</p>
        </div>
      </div>
    </div>
  )
}
