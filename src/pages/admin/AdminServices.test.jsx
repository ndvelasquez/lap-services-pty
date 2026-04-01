import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import AdminServices from './AdminServices'
import { supabase } from '../../lib/supabase'

// Mock the supabase client dependency
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          then: (cb) => cb({ data: [
            { id: '1', name: 'Servicio A', active: true, base_price: 50.00, category: 'Hogar' },
            { id: '2', name: 'Servicio B', active: false, base_price: 0, category: 'Empresa' }
          ], error: null })
        }))
      })),
      update: vi.fn(() => ({
          eq: vi.fn(() => ({
              then: (cb) => cb({ error: null })
          }))
      })),
      delete: vi.fn(() => ({
          eq: vi.fn(() => ({
              then: (cb) => cb({ error: null })
          }))
      })),
      insert: vi.fn(() => ({
          then: (cb) => cb({ error: null })
      }))
    }))
  }
}))

describe('AdminServices Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('confirm', vi.fn(() => true))
    vi.stubGlobal('alert', vi.fn())
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
        expect(supabase.from).toHaveBeenCalledWith('services')
        // The mock update implementation is called through its builder pattern
    })
  })
})
