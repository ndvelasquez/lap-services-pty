import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminAppointments from './AdminAppointments';
import * as api from '../../services/api';

// Mocks
vi.mock('../../services/api', () => ({
  getAllAppointments: vi.fn(),
  updateAppointment: vi.fn(),
}));

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <AdminAppointments />
    </BrowserRouter>
  );
};

describe('AdminAppointments Component', () => {
  const mockAppointments = [
    {
      id: 'apt-1',
      status: 'pending',
      appointment_date: '2026-10-25',
      start_time: '10:00:00',
      profiles: { name: 'Cliente Uno' },
      appointment_services: [{ services: { name: 'Limpieza de Apartamento' } }]
    },
    {
      id: 'apt-2',
      status: 'confirmed',
      appointment_date: '2026-10-26',
      start_time: '14:00:00',
      profiles: { name: 'Cliente Dos' },
      appointment_services: [{ services: { name: 'Lavado de Muebles' } }]
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    api.getAllAppointments.mockResolvedValue(mockAppointments);
    // Mock window.confirm
    vi.stubGlobal('confirm', vi.fn(() => true));
  });

  it('debe listar las citas correctamente', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Cliente Uno')).toBeInTheDocument();
      expect(screen.getByText('Cliente Dos')).toBeInTheDocument();
      expect(screen.getByText('Limpieza de Apartamento')).toBeInTheDocument();
    });
  });

  it('debe filtrar citas por búsqueda', async () => {
    renderComponent();
    
    await waitFor(() => screen.getByText('Cliente Uno'));

    const searchInput = screen.getByPlaceholderText(/Buscar cliente o servicio/i);
    fireEvent.change(searchInput, { target: { value: 'Cliente Dos' } });

    expect(screen.queryByText('Cliente Uno')).not.toBeInTheDocument();
    expect(screen.getByText('Cliente Dos')).toBeInTheDocument();
  });

  it('debe actualizar el estado de una cita al confirmar', async () => {
    api.updateAppointment.mockResolvedValue({ success: true });
    renderComponent();
    
    await waitFor(() => screen.getByText('Cliente Uno'));

    // Botón de confirmar (Check icon) para la primera cita
    const confirmButtons = screen.getAllByTitle('Confirmar');
    fireEvent.click(confirmButtons[0]);

    expect(window.confirm).toHaveBeenCalled();
    expect(api.updateAppointment).toHaveBeenCalledWith('apt-1', { status: 'confirmed' });
  });

  it('debe filtrar por estado usando los chips de filtro', async () => {
      renderComponent();
      await waitFor(() => screen.getByText('Cliente Uno'));

      const confirmedFilter = screen.getByRole('button', { name: /Confirmada/i });
      fireEvent.click(confirmedFilter);

      await waitFor(() => {
        expect(screen.queryByText('Cliente Uno')).not.toBeInTheDocument(); // era pending
        expect(screen.getByText('Cliente Dos')).toBeInTheDocument();    // era confirmed
      });
  });
});
