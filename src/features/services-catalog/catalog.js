// Catálogo operacional de servicios agendables (fuente única para el wizard).
// Los IDs coinciden con la tabla `services` en Supabase. La metadata de front-end
// (categoría, lógica de duración, formularios de detalle) vive aquí porque no
// forma parte del schema de la BD.

export const SERVICES_LIST = [
  { id: '00000000-0000-0000-0000-000000000001', cat: 'Limpieza de Espacios', name: 'Limpieza de Apartamento' },
  { id: '00000000-0000-0000-0000-000000000002', cat: 'Limpieza de Espacios', name: 'Limpieza de Casa' },
  { id: '00000000-0000-0000-0000-000000000003', cat: 'Limpieza de Espacios', name: 'Limpieza de Oficina' },
  { id: '00000000-0000-0000-0000-000000000004', cat: 'Limpieza de Espacios', name: 'Limpieza Post-Remodelación' },
  { id: '00000000-0000-0000-0000-000000000005', cat: 'Muebles', name: 'Limpieza de Sofás' },
  { id: '00000000-0000-0000-0000-000000000006', cat: 'Muebles', name: 'Limpieza de Colchones' },
  { id: '00000000-0000-0000-0000-000000000007', cat: 'Muebles', name: 'Limpieza de Alfombras' },
  { id: '00000000-0000-0000-0000-000000000008', cat: 'Muebles', name: 'Sillas de Oficina' },
  { id: '00000000-0000-0000-0000-000000000009', cat: 'Muebles', name: 'Persianas Rollers' },
  { id: '00000000-0000-0000-0000-000000000010', cat: 'Aire Acondicionado', name: 'Lavado de Split' },
  { id: '00000000-0000-0000-0000-000000000011', cat: 'Aire Acondicionado', name: 'Aire Central' },
  { id: '00000000-0000-0000-0000-000000000012', cat: 'Aire Acondicionado', name: 'Instalación de AC' },
  { id: '00000000-0000-0000-0000-000000000013', cat: 'Auto Detailing', name: 'Auto Detailing Interior' },
  { id: '00000000-0000-0000-0000-000000000014', cat: 'Auto Detailing', name: 'Lavado Completo Auto' },
  { id: '00000000-0000-0000-0000-000000000015', cat: 'Reparaciones', name: 'Plomería' },
  { id: '00000000-0000-0000-0000-000000000016', cat: 'Reparaciones', name: 'Electricidad' },
  { id: '00000000-0000-0000-0000-000000000017', cat: 'Reparaciones', name: 'Pintura General' },
]

export const ROOMS = ['Sala', 'Cocina', 'Comedor', 'Dormitorio Principal', 'Dormitorio 2', 'Dormitorio 3', 'Baño Principal', 'Baño 2', 'Balcón', 'Lavandería', 'Terraza']
export const FLOOR_TYPES = ['Cerámica', 'Porcelanato', 'Madera', 'Mármol', 'Vinilo', 'Granito', 'Otro']
export const AC_TYPES = ['Split', 'Ventana', 'Central', 'Cassette']
export const FURNITURE_MATERIALS = ['Tela', 'Cuero', 'Microfibra', 'Cuero sintético', 'Otro']

export const getCategoryFromId = (id) => SERVICES_LIST.find(s => s.id === id)?.cat

/**
 * Estima la duración total del servicio (minutos) según servicios y sus detalles.
 * Estimaciones estándar de la industria de limpieza profesional.
 */
export function estimateServiceDuration(selectedServices, spaceDetails, furnitureDetails, acDetails) {
  let totalMinutes = 0

  for (const serviceId of selectedServices) {
    const service = SERVICES_LIST.find(s => s.id === serviceId)
    if (!service) continue

    switch (serviceId) {
      // Limpieza de Espacios
      case '00000000-0000-0000-0000-000000000001': { // Apartamento
        const sqm = parseFloat(spaceDetails.sqm) || 50
        totalMinutes += Math.max(120, Math.ceil(sqm * 2)) // ~2 min/m², mínimo 2h
        break
      }
      case '00000000-0000-0000-0000-000000000002': { // Casa
        const sqm = parseFloat(spaceDetails.sqm) || 80
        totalMinutes += Math.max(150, Math.ceil(sqm * 2)) // ~2 min/m², mínimo 2.5h
        break
      }
      case '00000000-0000-0000-0000-000000000003': { // Oficina
        const sqm = parseFloat(spaceDetails.sqm) || 60
        totalMinutes += Math.max(120, Math.ceil(sqm * 1.5)) // ~1.5 min/m², mínimo 2h
        break
      }
      case '00000000-0000-0000-0000-000000000004': { // Post-Remodelación
        const sqm = parseFloat(spaceDetails.sqm) || 60
        totalMinutes += Math.max(180, Math.ceil(sqm * 3)) // ~3 min/m², mínimo 3h
        break
      }
      // Muebles
      case '00000000-0000-0000-0000-000000000005': // Sofás
        totalMinutes += (furnitureDetails.seats || 2) * 30 // ~30 min/asiento
        break
      case '00000000-0000-0000-0000-000000000006': { // Colchones
        const sizeMap = { 'Twin': 45, 'Full': 60, 'Queen': 75, 'King': 90 }
        totalMinutes += sizeMap[furnitureDetails.mattressSize] || 75
        break
      }
      case '00000000-0000-0000-0000-000000000007': { // Alfombras
        const w = parseFloat(furnitureDetails.carpetWidth) || 200
        const h = parseFloat(furnitureDetails.carpetHeight) || 300
        const unit = furnitureDetails.carpetUnit
        let areaSqm
        if (unit === 'pulgadas') {
          areaSqm = (w * 0.0254) * (h * 0.0254)
        } else {
          areaSqm = (w / 100) * (h / 100) // cm a m
        }
        totalMinutes += Math.max(30, Math.ceil(areaSqm * 5)) // ~5 min/m²
        break
      }
      case '00000000-0000-0000-0000-000000000008': // Sillas de Oficina
        totalMinutes += (furnitureDetails.pieces || 1) * 15 // ~15 min/pieza
        break
      case '00000000-0000-0000-0000-000000000009': // Persianas Rollers
        totalMinutes += (furnitureDetails.pieces || 1) * 20 // ~20 min/pieza
        break
      // Aire Acondicionado
      case '00000000-0000-0000-0000-000000000010': // Split
        totalMinutes += (acDetails.qty || 1) * 60 // ~60 min/unidad
        break
      case '00000000-0000-0000-0000-000000000011': // Central
        totalMinutes += (acDetails.qty || 1) * 120 // ~120 min/unidad
        break
      case '00000000-0000-0000-0000-000000000012': // Instalación
        totalMinutes += (acDetails.qty || 1) * 180 // ~180 min/unidad
        break
      // Auto Detailing
      case '00000000-0000-0000-0000-000000000013': // Interior
        totalMinutes += 150
        break
      case '00000000-0000-0000-0000-000000000014': // Lavado Completo
        totalMinutes += 120
        break
      // Reparaciones
      case '00000000-0000-0000-0000-000000000015': // Plomería
        totalMinutes += 120
        break
      case '00000000-0000-0000-0000-000000000016': // Electricidad
        totalMinutes += 90
        break
      case '00000000-0000-0000-0000-000000000017': // Pintura
        totalMinutes += 180
        break
      default:
        totalMinutes += 60 // Fallback 1h
    }
  }

  // Mínimo 60 minutos para cualquier combinación
  return Math.max(60, totalMinutes)
}
