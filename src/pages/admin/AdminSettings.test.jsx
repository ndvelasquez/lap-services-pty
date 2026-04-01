import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import AdminSettings from './AdminSettings'
import { supabase } from '../../lib/supabase'

// Mock the dependencies
vi.mock('../../lib/supabase', () => ({
  supabase: {
      auth: {
          updateUser: vi.fn(() => ({ data: {}, error: null }))
      }
  }
}))

vi.mock('../../services/api', () => ({
  getCurrentUser: vi.fn(() => Promise.resolve({ id: 'admin-1', email: 'admin@lap.com' }))
}))

describe('AdminSettings Component', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('debe cargar la configuración correctamente', async () => {
        render(<AdminSettings />)

        expect(screen.getByText('Configuración del Sistema')).toBeInTheDocument()
        expect(screen.getByText('Seguridad de la Cuenta')).toBeInTheDocument()
        
        await waitFor(() => {
            expect(screen.getByText('admin@lap.com')).toBeInTheDocument()
        })
    })

    it('debe permitir cambiar la contraseña', async () => {
        render(<AdminSettings />)

        const passInput = screen.getByPlaceholderText('Mínimo 6 caracteres')
        fireEvent.change(passInput, { target: { value: 'password123' } })
        
        const confirmInput = screen.getByPlaceholderText('Repite la contraseña')
        fireEvent.change(confirmInput, { target: { value: 'password123' } })

        const updateBtn = screen.getByText('Cambiar Contraseña')
        fireEvent.click(updateBtn)

        await waitFor(() => {
            expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: 'password123' })
        })
    })
})
