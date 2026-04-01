import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import QuotationBuilder from './QuotationBuilder';
import * as api from '../../services/api';

// Mocks
vi.mock('../../services/api', () => ({
  getQuotationById: vi.fn(),
  getAppointment: vi.fn(),
  getAllAppointments: vi.fn(),
  createQuotation: vi.fn(),
  updateQuotation: vi.fn(),
  getServices: vi.fn(),
  generateQuotationPdf: vi.fn(),
  updateAppointment: vi.fn(),
}));

const renderComponent = (initialEntries = ['/admin/cotizaciones/nueva?appointment_id=apt-123']) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/admin/cotizaciones/nueva" element={<QuotationBuilder />} />
      </Routes>
    </MemoryRouter>
  );
};

describe('QuotationBuilder Component', () => {
  const mockAppointment = {
    id: 'apt-123',
    client_id: 'client-123',
    appointment_date: '2026-10-25',
    start_time: '14:00',
    profiles: {
      name: 'Nestor Test',
      email: 'nestor@test.com',
      phone: '12345678',
      address: 'Panama City'
    },
    appointment_services: [
      { 
        services: { name: 'Limpieza de Apartamento' }, 
        custom_details: { sqm: 100, isDeepCleaning: true } 
      }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
    api.getAllAppointments.mockResolvedValue([mockAppointment]);
    api.getAppointment.mockResolvedValue(mockAppointment);
    api.getServices.mockResolvedValue([
      { id: 'srv-1', name: 'Limpieza de Apartamento', base_price: 50 }
    ]);
  });

  it('debe cargar los datos del cliente y la cita correctamente', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText(/Nestor Test/i)).toBeInTheDocument();
      expect(screen.getByText(/nestor@test.com/i)).toBeInTheDocument();
    });
  });

  it('debe calcular el ITBMS (7%) correctamente al añadir items', async () => {
    renderComponent();
    
    // Esperar a que cargue
    await waitFor(() => screen.getByText(/Nestor Test/i));

    // Añadir un item manual
    const conceptInput = screen.getByPlaceholderText(/Concepto/i);
    const priceInput = screen.getByPlaceholderText(/Precio/i);
    const addButton = screen.getByText(/Agregar ítem/i);

    fireEvent.change(conceptInput, { target: { value: 'Servicio Extra' } });
    fireEvent.change(priceInput, { target: { value: '100' } });
    fireEvent.click(addButton);

    // Subtotal: 100, ITBMS: 7, Total: 107
    await waitFor(() => {
      expect(screen.getByTestId('subtotal-value').textContent).toContain('100.00');
      expect(screen.getByTestId('tax-value').textContent).toContain('7.00');
      expect(screen.getByTestId('total-value').textContent).toContain('107.00');
    }, { timeout: 3000 });
  });

  it('debe abrir el modal de detalles del servicio con la información correcta', async () => {
    renderComponent();

    await waitFor(() => {
      const detailButton = screen.getByText(/Detalles/i);
      fireEvent.click(detailButton);
    });

    // Verificar que el modal contiene la info traducida (de formatters)
    expect(screen.getByText(/Metros Cuadrados/i)).toBeInTheDocument();
    expect(screen.getByText(/100/i)).toBeInTheDocument();
    expect(screen.getByText(/Limpieza Profunda/i)).toBeInTheDocument();
  });
});
