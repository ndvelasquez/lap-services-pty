export default function AppointmentDetail() {
  return (
    <div style={{ paddingTop: '100px', paddingBottom: '80px' }}>
      <div className="container">
        <h1 style={{ marginBottom: '2rem' }}>Detalle de Cita</h1>
        <div className="card" style={{ padding: '2rem' }}>
          <p style={{ color: 'var(--dark-400)' }}>Aquí se mostrará el detalle completo de la cita seleccionada. Esta vista se conectará con n8n para obtener los datos.</p>
        </div>
      </div>
    </div>
  )
}
