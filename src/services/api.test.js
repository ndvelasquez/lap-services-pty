import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createQuotation, updateQuotation, getQuotationById, deleteQuotation } from './api';
import { supabase } from '../lib/supabase';

// Mock de Supabase
vi.mock('../lib/supabase', () => {
  const mockFrom = vi.fn();
  return {
    supabase: {
      from: mockFrom
    }
  };
});

describe('api service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createQuotation', () => {
    it('should calculate totals and insert quotation and items', async () => {
      const quoteInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'quote-123' }, error: null })
        })
      });
      const itemsInsert = vi.fn().mockResolvedValue({ data: [], error: null });

      supabase.from.mockImplementation((table) => {
        if (table === 'quotations') return { insert: quoteInsert };
        if (table === 'quotation_items') return { insert: itemsInsert };
        return { insert: vi.fn() };
      });

      const input = {
        appointmentId: 'apt-1',
        clientId: 'client-1',
        items: [
          { concept: 'S1', description: 'D1', quantity: 2, unitPrice: 50.0 }
        ],
        conditions: 'Notes',
        taxRate: 0.07
      };

      await createQuotation(input);

      expect(supabase.from).toHaveBeenCalledWith('quotations');
      const quoteCall = quoteInsert.mock.calls[0][0][0];
      console.log('Quote Call:', JSON.stringify(quoteCall, null, 2));
      expect(quoteCall).toMatchObject({
        appointment_id: 'apt-1',
        client_id: 'client-1',
        subtotal: 100,
        tax: 7,
        total: 107
      });

      expect(supabase.from).toHaveBeenCalledWith('quotation_items');
      const itemsCall = itemsInsert.mock.calls[0][0][0];
      expect(itemsCall).toMatchObject({
        concept: 'S1',
        unit_price: 50,
        subtotal: 100
      });
    });
  });

  describe('getQuotationById', () => {
    it('should fetch quote, profile, appointment and items', async () => {
      supabase.from.mockImplementation((table) => {
        const mockSingle = (data) => vi.fn().mockResolvedValue({ data, error: null });
        const mockSelect = (data) => ({
          eq: vi.fn().mockReturnThis(),
          single: mockSingle(data),
          order: vi.fn().mockReturnThis(),
          inner: vi.fn().mockResolvedValue({ data, error: null }) // simplified
        });

        if (table === 'quotations') {
          return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { id: 'q1', client_id: 'p1', appointment_id: 'a1' }, error: null }) }) }) };
        }
        if (table === 'profiles') {
          return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { name: 'Juan' }, error: null }) }) }) };
        }
        if (table === 'appointments') {
          return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { appointment_date: '2024-01-01' }, error: null }) }) }) };
        }
        if (table === 'quotation_items') {
          return { select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [{ concept: 'Item 1' }], error: null }) }) }) };
        }
      });

      const result = await getQuotationById('q1');

      expect(result.id).toBe('q1');
      expect(result.profiles.name).toBe('Juan');
      expect(result.items).toHaveLength(1);
    });
  });

  describe('deleteQuotation', () => {
    it('should delete a draft quotation', async () => {
      const mockSingle = vi.fn().mockResolvedValue({ data: { id: 'q1', status: 'draft' }, error: null });
      const mockDelete = vi.fn().mockResolvedValue({ error: null });

      supabase.from.mockImplementation((table) => {
        if (table === 'quotations') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: mockSingle,
            delete: vi.fn().mockReturnThis()
          };
        }
      });
      
      // Override for the delete call nested in the chain
      const deleteEq = vi.fn().mockResolvedValue({ error: null });
      const deleteMock = vi.fn().mockReturnValue({ eq: deleteEq });
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: mockSingle,
        delete: deleteMock
      });

      const result = await deleteQuotation('q1');
      expect(result).toBe(true);
      expect(deleteMock).toHaveBeenCalled();
      expect(deleteEq).toHaveBeenCalledWith('id', 'q1');
    });

    it('should throw an error for an accepted quotation', async () => {
      const mockSingle = vi.fn().mockResolvedValue({ data: { id: 'q1', status: 'accepted' }, error: null });
      
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: mockSingle
      });

      await expect(deleteQuotation('q1')).rejects.toThrow('No se puede eliminar una cotización aceptada');
    });
  });
});
