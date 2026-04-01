import { flattenObject, translateKey, formatServiceDetails, extractServiceMetadata } from './formatters';

describe('formatters utility', () => {
  describe('flattenObject', () => {
    it('should flatten a nested object', () => {
      const input = {
        ac: {
          type: 'Split',
          btu: 12000
        },
        qty: 1
      };
      const result = flattenObject(input);
      expect(result).toEqual([
        { k: 'ac type', v: 'Split' },
        { k: 'ac btu', v: 12000 },
        { k: 'qty', v: 1 }
      ]);
    });

    it('should ignore null, empty strings and empty arrays', () => {
      const input = {
        name: 'Test',
        empty: '',
        nullVal: null,
        emptyArr: []
      };
      const result = flattenObject(input);
      expect(result).toEqual([{ k: 'name', v: 'Test' }]);
    });

    it('should join arrays with commas', () => {
      const input = {
        list: ['A', 'B', 'C']
      };
      const result = flattenObject(input);
      expect(result).toEqual([{ k: 'list', v: 'A, B, C' }]);
    });
  });

  describe('translateKey', () => {
    it('should translate known keys', () => {
      expect(translateKey('ac')).toBe('Aire Acondicionado');
      expect(translateKey('sqm')).toBe('Metros Cuadrados');
    });

    it('should use PascalCase to Space transition for unknown keys', () => {
      expect(translateKey('customField')).toBe('Custom Field');
    });

    it('should combine flattened keys', () => {
      // 'ac type' -> 'Aire Acondicionado - Tipo'
      expect(translateKey('ac type')).toBe('Aire Acondicionado - Tipo');
    });
  });

  describe('formatServiceDetails', () => {
    it('should process a full details object', () => {
      const details = {
        furniture: {
          material: 'Cuero',
          seats: 3
        }
      };
      const result = formatServiceDetails(details);
      expect(result).toEqual([
        { k: 'Mobiliario - Material', v: 'Cuero' },
        { k: 'Mobiliario - Puestos/Asientos', v: 3 }
      ]);
    });

    it('should handle undefined input', () => {
      expect(formatServiceDetails(undefined)).toEqual([]);
    });
  });
  describe('extractServiceMetadata', () => {
    const complexData = {
      ac: { type: 'Split', btu: 12000 },
      sqm: 100,
      furniture: { seats: 3, material: 'Tela' },
      isDeepCleaning: true
    };

    it('should extract only AC details for an AC service', () => {
      const result = extractServiceMetadata('Limpieza de Aire Acondicionado', complexData);
      expect(result).toHaveLength(2);
      expect(result.some(i => i.k === 'Aire Acondicionado - Tipo')).toBe(true);
      expect(result.some(i => i.k === 'Aire Acondicionado - Capacidad (BTU)')).toBe(true);
      expect(result.find(i => i.k === 'Aire Acondicionado - Tipo').v).toBe('Split');
    });

    it('should extract only furniture details for a Sofa service', () => {
      const result = extractServiceMetadata('Limpieza de Sofá', complexData);
      expect(result.some(i => i.k === 'Mobiliario - Puestos/Asientos')).toBe(true);
      expect(result.every(i => !i.k.includes('Aire'))).toBe(true);
    });

    it('should extract sqm and deep cleaning for house cleaning', () => {
      const result = extractServiceMetadata('Limpieza de Apartamento', complexData);
      expect(result.some(i => i.k === 'Espacio (Inmueble) - Metros Cuadrados')).toBe(true);
      expect(result.some(i => i.k === 'Espacio (Inmueble) - Limpieza Profunda')).toBe(true);
    });

    it('should return all details if no service name provided', () => {
      const result = extractServiceMetadata(null, complexData);
      expect(result.length).toBeGreaterThan(4);
    });

    it('should handle mattress size translation and extraction', () => {
      const mattressData = {
        furniture: { mattressSize: 'Queen', material: 'Tela' }
      };
      const result = extractServiceMetadata('Limpieza de Colchón', mattressData);
      expect(result.some(i => i.k === 'Mobiliario - Tamaño')).toBe(true);
      expect(result.find(i => i.k === 'Mobiliario - Tamaño').v).toBe('Queen');
    });

    it('should handle carpet dimensions translation and extraction', () => {
      const carpetData = {
        furniture: { carpetWidth: 2, carpetHeight: 3, carpetUnit: 'cm' }
      };
      const result = extractServiceMetadata('Limpieza de Alfombra', carpetData);
      expect(result.some(i => i.k === 'Mobiliario - Ancho')).toBe(true);
      expect(result.some(i => i.k === 'Mobiliario - Largo')).toBe(true);
      expect(result.find(i => i.k === 'Mobiliario - Unidad').v).toBe('cm');
    });

    it('should handle undefined data gracefully', () => {
      expect(extractServiceMetadata('Any', undefined)).toEqual([]);
    });
  });
});
