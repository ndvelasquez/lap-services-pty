import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AdminQuotations from './AdminQuotations'
import * as api from '../../services/api'

// Mock the API functions
vi.mock('../../services/api', () => ({
  getAllQuotations: vi.fn(),
  regenerateQuotationPdf: vi.fn(),
  sendQuotation: vi.fn(),
  generateQuotationPdf: vi.fn(),
  deleteQuotation: vi.fn(),
}))

describe('AdminQuotations Component', () => {
  const mockQuotations = [
    {
      id: 'quote-1',
      total: 150.00,
      status: 'draft',
      pdf_url: null,
      created_at: new Date().toISOString(),
      profiles: { name: 'Client A' }
    },
    {
      id: 'quote-2',
      total: 250.00,
      status: 'sent',
      pdf_url: 'http://example.com/pdf.pdf',
      created_at: new Date().toISOString(),
      profiles: { name: 'Client B' }
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    api.getAllQuotations.mockResolvedValue(mockQuotations)
    // Silencing window.confirm for tests
    vi.stubGlobal('confirm', vi.fn(() => true))
    // Silencing window.alert
    vi.stubGlobal('alert', vi.fn())
  })

  it('debe listar todas las cotizaciones correctamente', async () => {
    render(
      <MemoryRouter>
        <AdminQuotations />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.queryByText(/Cargando/i)).not.toBeInTheDocument()
    })

    expect(screen.getByText('Client A')).toBeInTheDocument()
    expect(screen.getByText('Client B')).toBeInTheDocument()
    expect(screen.getByText('$150.00')).toBeInTheDocument()
    expect(screen.getByText('$250.00')).toBeInTheDocument()
  })

  it('debe filtrar cotizaciones por búsqueda', async () => {
    render(
      <MemoryRouter>
        <AdminQuotations />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Buscar por cliente/i)).toBeInTheDocument()
    })

    const input = screen.getByPlaceholderText(/Buscar por cliente/i)
    fireEvent.change(input, { target: { value: 'Client A' } })

    expect(screen.getByText('Client A')).toBeInTheDocument()
    expect(screen.queryByText('Client B')).not.toBeInTheDocument()
  })

  it('debe llamar a generateQuotationPdf al hacer click en el botón correspondiente', async () => {
    render(
      <MemoryRouter>
        <AdminQuotations />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTitle('Generar PDF')).toBeInTheDocument()
    })

    const generateBtn = screen.getByTitle('Generar PDF')
    fireEvent.click(generateBtn)

    expect(api.generateQuotationPdf).toHaveBeenCalledWith('quote-1')
  })

  it('debe llamar a sendQuotation al hacer click en el botón de enviar', async () => {
    render(
      <MemoryRouter>
        <AdminQuotations />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTitle('Enviar al Cliente')).toBeInTheDocument()
    })

    const sendBtn = screen.getByTitle('Enviar al Cliente')
    fireEvent.click(sendBtn)

    expect(api.sendQuotation).toHaveBeenCalledWith('quote-2')
  })

  it('debe borrar una cotización después de confirmar', async () => {
    render(
      <MemoryRouter>
        <AdminQuotations />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getAllByTitle('Eliminar')[0]).toBeInTheDocument()
    })

    const deleteBtns = screen.getAllByTitle('Eliminar')
    fireEvent.click(deleteBtns[0])

    expect(api.deleteQuotation).toHaveBeenCalledWith('quote-1')
  })
})
