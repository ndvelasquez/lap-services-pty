import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminAppointments from './AdminAppointments';
import QuotationBuilder from './QuotationBuilder';
import * as api from '../../services/api';

// Mocks
vi.mock('../../services/api', () => ({
  getAllAppointments: vi.fn(),
  getAppointment: vi.fn(),
  getServices: vi.fn(),
  getQuotationById: vi.fn(),
}));

describe('Admin Integration Flow: Appointment -> Quotation', () => {
  const mockAppointment = {
    id: 'apt-integration-123',
    status: 'pending',
    appointment_date: '2026-10-30',
    start_time: '09:00:00',
    profiles: { 
      name: 'Test Integration User',
      email: 'integration@test.com',
      phone: '9999-8888',
      address: 'Panama Pacifico'
    },
    appointment_services: [
      { 
        services: { name: 'Limpieza de Apartamento' }, 
        custom_details: { sqm: 120, isDeepCleaning: false } 
      }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
    api.getAllAppointments.mockResolvedValue([mockAppointment]);
    api.getAppointment.mockResolvedValue(mockAppointment);
    api.getServices.mockResolvedValue([
      { id: 'srv-1', name: 'Limpieza de Apartamento', base_price: 60 }
    ]);
  });

  const renderAdminFlow = (initialEntries = ['/admin/citas']) => {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/admin/citas" element={<AdminAppointments />} />
          <Route path="/admin/cotizaciones/nueva" element={<QuotationBuilder />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('debe navegar desde la lista de citas hacia el creador de cotizaciones con los datos correctos', async () => {
    renderAdminFlow();

    // 1. Verificar que estamos en la lista de citas y vemos al usuario
    await waitFor(() => {
      expect(screen.getByText('Test Integration User')).toBeInTheDocument();
    });

    // 2. Hacer clic en el botón "Cotizar"
    const quoteButton = screen.getByTitle('Crear Cotización');
    fireEvent.click(quoteButton);

    // 3. Verificar que navegamos al QuotationBuilder y los datos se precargan
    await waitFor(() => {
      // El título del QuotationBuilder aparece
      expect(screen.getByText(/Constructor de Cotizaciones/i)).toBeInTheDocument();
      // Los datos del cliente se autocompletaron
      expect(screen.getByText('Test Integration User')).toBeInTheDocument();
      expect(screen.getByText('integration@test.com')).toBeInTheDocument();
      // El servicio está en la lista de solicitudes del cliente (usualmente con número)
      expect(screen.getByText(/Limpieza de Apartamento/i)).toBeInTheDocument();
      // Y también aparece en la tabla de ítems como valor del input
      expect(screen.getByDisplayValue('Limpieza de Apartamento')).toBeInTheDocument();
    }, { timeout: 4000 });
  });

  it('debe mostrar los detalles del servicio correctamente en el modal de integración', async () => {
    // Empezamos directamente en la pantalla de cotización para acortar
    renderAdminFlow(['/admin/cotizaciones/nueva?appointment_id=apt-integration-123']);

    await waitFor(() => {
      expect(screen.getByText(/Test Integration User/i)).toBeInTheDocument();
    });

    // Abrir el modal de detalles
    const detailButton = screen.getByText(/Detalles/i);
    fireEvent.click(detailButton);

    // Verificar contenido del modal (vía QuotationBuilder logic)
    await waitFor(() => {
        expect(screen.getByText(/Metros Cuadrados/i)).toBeInTheDocument();
        expect(screen.getByText('120')).toBeInTheDocument();
    });
  });
});
