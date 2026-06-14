import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import AdminServices from './AdminServices'
import * as api from '../../services/api'

// Mock de la capa de datos (módulo services-catalog vía barrel services/api)
vi.mock('../../services/api', () => ({
  getAllServices: vi.fn(),
  createService: vi.fn(),
  updateService: vi.fn(),
  toggleServiceActive: vi.fn()
}))

describe('AdminServices Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('confirm', vi.fn(() => true))
    vi.stubGlobal('alert', vi.fn())
    api.getAllServices.mockResolvedValue([
      { id: '1', name: 'Servicio A', active: true, base_price: 50.00, category: 'Hogar' },
      { id: '2', name: 'Servicio B', active: false, base_price: 0, category: 'Empresa' }
    ])
    api.createService.mockResolvedValue([])
    api.updateService.mockResolvedValue(undefined)
    api.toggleServiceActive.mockResolvedValue(undefined)
  })

  it('debe listar los servicios correctamente', async () => {
    render(<AdminServices />)

    await waitFor(() => {
        expect(screen.queryByText(/Cargando/i)).not.toBeInTheDocument()
    })

    expect(screen.getByText('Servicio A')).toBeInTheDocument()
    expect(screen.getByText('Servicio B')).toBeInTheDocument()
    expect(screen.getByText('$50.00')).toBeInTheDocument()
  })

  it('debe abrir el modal de edición y mostrar precio y categoría', async () => {
    render(<AdminServices />)

    await waitFor(() => {
        expect(screen.getAllByTitle('Editar información')[0]).toBeInTheDocument()
    })

    const editBtn = screen.getAllByTitle('Editar información')[0]
    fireEvent.click(editBtn)

    expect(screen.getByText('Editar Servicio')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Servicio A')).toBeInTheDocument()
    expect(screen.getByDisplayValue('50')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Hogar')).toBeInTheDocument()
  })

  it('debe llamar a update al guardar los cambios en un servicio', async () => {
    render(<AdminServices />)

    await waitFor(() => {
        fireEvent.click(screen.getAllByTitle('Editar información')[0])
    })

    const priceInput = screen.getByPlaceholderText('0.00')
    fireEvent.change(priceInput, { target: { value: '75.50' } })

    const saveBtn = screen.getByText('Guardar')
    fireEvent.click(saveBtn)

    await waitFor(() => {
        expect(api.updateService).toHaveBeenCalled()
    })
  })
})
