import { Routes, Route } from 'react-router-dom'
import PublicLayout from './components/layout/PublicLayout'
import AdminLayout from './components/layout/AdminLayout'
import Landing from './pages/Landing'
import Services from './pages/Services'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import BookingFlow from './pages/booking/BookingFlow'
import ClientDashboard from './pages/client/ClientDashboard'
import ClientAppointmentDetail from './pages/client/AppointmentDetail'
import ClientQuotationDetail from './pages/client/QuotationDetail'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminCalendar from './pages/admin/AdminCalendar'
import AdminAppointments from './pages/admin/AdminAppointments'
import AdminQuotations from './pages/admin/AdminQuotations'
import AdminQuotationBuilder from './pages/admin/QuotationBuilder'
import AdminAbonos from './pages/admin/AdminAbonos'
import AdminServices from './pages/admin/AdminServices'
import AdminClients from './pages/admin/AdminClients'
import AdminSettings from './pages/admin/AdminSettings'

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/servicios" element={<Services />} />
        <Route path="/agendar" element={<BookingFlow />} />
      </Route>

      {/* Auth Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Register />} />

      {/* Client Routes */}
      <Route element={<PublicLayout />}>
        <Route path="/mi-panel" element={<ClientDashboard />} />
        <Route path="/mi-panel/citas/:id" element={<ClientAppointmentDetail />} />
        <Route path="/mi-panel/cotizaciones/:id" element={<ClientQuotationDetail />} />
      </Route>

      {/* Admin Routes */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="calendario" element={<AdminCalendar />} />
        <Route path="citas" element={<AdminAppointments />} />
        <Route path="cotizaciones" element={<AdminQuotations />} />
        <Route path="cotizaciones/nueva" element={<AdminQuotationBuilder />} />
        <Route path="cotizaciones/editar" element={<AdminQuotationBuilder />} />
        <Route path="abonos" element={<AdminAbonos />} />
        <Route path="servicios" element={<AdminServices />} />
        <Route path="clientes" element={<AdminClients />} />
        <Route path="configuracion" element={<AdminSettings />} />
      </Route>
    </Routes>
  )
}

export default App
