import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AdminDashboard from './AdminDashboard'
import * as api from '../../services/api'

// Mock the API and supabase client
vi.mock('../../services/api', () => ({
  getAllAppointments: vi.fn(),
  getIncomeStats: vi.fn(),
  getClientCount: vi.fn()
}))

describe('AdminDashboard Component', () => {
  const mockAppointments = [
    {
      id: '1',
      appointment_date: new Date().toISOString().split('T')[0],
      start_time: '09:00:00',
      status: 'confirmed',
      profiles: { name: 'Test Client' },
      appointment_services: [{ services: { name: 'Limpieza' } }]
    },
    {
      id: '2',
      appointment_date: '2023-01-01',
      start_time: '10:00:00',
      status: 'pending',
      profiles: { name: 'Another Client' },
      appointment_services: [{ services: { name: 'Muebles' } }]
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    api.getAllAppointments.mockResolvedValue(mockAppointments)
    api.getIncomeStats.mockResolvedValue({ confirmedIncome: 300.50, depositsInTransit: 0, depositsPendingVerification: 0 })
    api.getClientCount.mockResolvedValue(10)
  })

  it('debe cargar y mostrar los KPIs correctamente', async () => {
    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    )

    // Wait for the data to load
    await waitFor(() => {
      expect(screen.queryByText(/Cargando/i)).not.toBeInTheDocument()
    })

    // Check Today's Appointments KPI
    expect(screen.getByTestId('kpi-today')).toHaveTextContent('1')
    
    // Check Pending KPI (only 1 pending in mock)
    expect(screen.getByTestId('kpi-pending')).toHaveTextContent('1')

    // Check Income KPI (100.50 + 200.00 = 300.50)
    expect(screen.getByTestId('kpi-income')).toHaveTextContent('$300.50')

    // Check Registered Clients KPI (mocked as 10)
    expect(screen.getByTestId('kpi-clients')).toHaveTextContent('10')
  })

  it('debe mostrar la lista de citas del día', async () => {
    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('today-list')).toBeInTheDocument()
    })

    expect(screen.getByText('Test Client')).toBeInTheDocument()
    expect(screen.getByText('Limpieza')).toBeInTheDocument()
  })

  it('debe renderizar la actividad reciente', async () => {
    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('activity-list')).toBeInTheDocument()
    })

    expect(screen.getByText('Nueva solicitud: Test Client')).toBeInTheDocument()
    expect(screen.getByText('Nueva solicitud: Another Client')).toBeInTheDocument()
  })
})
