import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import AdminClients from './AdminClients'
import * as api from '../../services/api'

// Mock the API functions
vi.mock('../../services/api', () => ({
  getAllClients: vi.fn(),
  getAllAppointments: vi.fn(),
}))

describe('AdminClients Component', () => {
    const mockClients = [
        { id: 'client-1', name: 'John Doe', email: 'john@example.com', phone: '1234567' },
        { id: 'client-2', name: 'Jane Smith', email: 'jane@example.com', phone: '7654321' }
    ]

    const mockAppointments = [
        { id: 'apt-1', client_id: 'client-1', appointment_date: '2023-10-01', created_at: '2023-09-01' },
        { id: 'apt-2', client_id: 'client-1', appointment_date: '2023-11-01', created_at: '2023-10-01' }
    ]

    beforeEach(() => {
        vi.clearAllMocks()
        api.getAllClients.mockResolvedValue(mockClients)
        api.getAllAppointments.mockResolvedValue(mockAppointments)
    })

    it('debe listar los clientes y sus estadísticas de visitas', async () => {
        render(<AdminClients />)

        await waitFor(() => {
            expect(screen.queryByText(/Cargando/i)).not.toBeInTheDocument()
        })

        expect(screen.getByText('John Doe')).toBeInTheDocument()
        expect(screen.getByText('Jane Smith')).toBeInTheDocument()
        expect(screen.getByText('2 citas totales')).toBeInTheDocument() // John has 2
        expect(screen.getByText('0 citas totales')).toBeInTheDocument() // Jane has 0
    })

    it('debe filtrar clientes por búsqueda', async () => {
        render(<AdminClients />)

        await waitFor(() => {
            expect(screen.getByPlaceholderText(/Buscar cliente/i)).toBeInTheDocument()
        })

        const input = screen.getByPlaceholderText(/Buscar cliente/i)
        fireEvent.change(input, { target: { value: 'Jane' } })

        expect(screen.getByText('Jane Smith')).toBeInTheDocument()
        expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
    })
})
