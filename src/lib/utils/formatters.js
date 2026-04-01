/**
 * Diccionario de traducciones para las claves técnicas de los servicios.
 */
export const SERVICE_TRANSLATIONS = {
  ac: 'Aire Acondicionado',
  btu: 'Capacidad (BTU)',
  qty: 'Cantidad',
  type: 'Tipo',
  brand: 'Marca',
  space: 'Espacio (Inmueble)',
  sqm: 'Metros Cuadrados',
  floor: 'Tipo de Piso',
  rooms: 'Áreas Incluidas',
  repair: 'Reparación/Instalación',
  details: 'Detalles Adicionales',
  furniture: 'Mobiliario',
  notes: 'Notas/Condición',
  seats: 'Puestos/Asientos',
  pieces: 'Piezas',
  material: 'Material',
  carpetUnit: 'Unidad',
  carpetWidth: 'Ancho',
  carpetHeight: 'Largo',
  mattressSize: 'Tamaño',
  size: 'Size',
  width: 'Ancho',
  height: 'Alto/Largo',
  isRepair: 'Es Reparación',
  repairDetails: 'Detalles de Reparación',
  additionalNotes: 'Notas Adicionales',
  serviceType: 'Tipo de Servicio',
  quantity: 'Cantidad',
  description: 'Descripción',
  metros_cuadrados: 'Metros Cuadrados',
  isDeepCleaning: 'Limpieza Profunda',
  mattress: 'Colchón',
  size: 'Tamaño',
  width: 'Ancho',
  height: 'Alto/Largo',
  unit: 'Unidad',
  carpet: 'Alfombra',
  ac_type: 'Tipo de Aire',
  ac_btu: 'BTU',
  ac_qty: 'Cantidad de Aires'
};

/**
 * Identifica y extrae solo los metadatos relevantes para un tipo de servicio específico
 * desde un objeto de detalles consolidado.
 * @param {string} serviceName - Nombre del servicio (ej: 'Limpieza de Apartamento').
 * @param {Object} allDetails - El objeto de detalles completo del appointment.
 * @returns {Object} Un subconjunto de detalles pertinentes.
 */
export const extractServiceMetadata = (serviceName, allDetails) => {
  if (!allDetails || typeof allDetails !== 'object') return [];
  
  const name = (serviceName || '').toLowerCase();
  const result = {};

  // 1. Limpieza de Espacios (Apartamento, Casa, Oficina, etc.)
  if (name.includes('apartamento') || name.includes('casa') || name.includes('comercial') || name.includes('mudanza') || name.includes('oficina')) {
    if (allDetails.space) {
        result.space = allDetails.space;
    } else if (allDetails.sqm || allDetails.meters_cuadrados) {
      result.space = {
        sqm: allDetails.sqm || allDetails.meters_cuadrados,
        type: allDetails.type,
        floor: allDetails.floor,
        rooms: allDetails.rooms,
        isDeepCleaning: allDetails.isDeepCleaning
      };
    }
  } 
  
  // 2. Aire Acondicionado
  if (name.includes('aire') || name.includes('ac ') || name.includes('split') || name.includes('mantenimiento')) {
    if (allDetails.ac) result.ac = allDetails.ac;
    if (allDetails.repair) result.repair = allDetails.repair;
    if (!allDetails.ac && (allDetails.btu || allDetails.brand)) {
        result.ac = {
            qty: allDetails.qty,
            brand: allDetails.brand,
            btu: allDetails.btu,
            type: allDetails.type
        };
    }
  }

  // 3. Muebles, Sofás, Sillas
  if (name.includes('sofá') || name.includes('silla') || name.includes('mueble') || name.includes('comedor')) {
    if (allDetails.furniture && !name.includes('alfombra') && !name.includes('colchon')) {
        result.furniture = {
          material: allDetails.furniture.material,
          seats: allDetails.furniture.seats,
          pieces: allDetails.furniture.pieces,
          notes: allDetails.furniture.notes
        };
    }
  }

  // 4. Alfombras
  if (name.includes('alfombra')) {
    if (allDetails.furniture?.carpetWidth || allDetails.furniture?.width) {
      result.furniture = {
        carpetWidth: allDetails.furniture.carpetWidth || allDetails.furniture.width,
        carpetHeight: allDetails.furniture.carpetHeight || allDetails.furniture.height,
        carpetUnit: allDetails.furniture.carpetUnit || allDetails.furniture.unit
      };
    } else if (allDetails.carpet) {
        result.furniture = allDetails.carpet;
    }
  }

  // 5. Colchones
  if (name.includes('colchon')) {
    if (allDetails.furniture?.mattressSize || allDetails.furniture?.size) {
      result.furniture = {
        mattressSize: allDetails.furniture.mattressSize || allDetails.furniture.size
      };
    }
  }

  // 6. Reparaciones específicas
  if (name.includes('reparación') || name.includes('instala')) {
     if (allDetails.repair) result.repair = allDetails.repair;
     else if (allDetails.description) result.repair = { description: allDetails.description };
  }

  // Fallback: if result is empty but allDetails has data, use allDetails
  let finalObj = result;
  if (Object.keys(result).length === 0 && Object.keys(allDetails).length > 0) {
    finalObj = allDetails;
  }

  return formatServiceDetails(finalObj);
};

/**
 * Aplana un objeto anidado en una lista de entradas clave-valor lineales.
 */
export const flattenObject = (obj, prefix = '') => {
  const entries = [];
  
  const recurse = (currentObj, currentPrefix = '') => {
    if (!currentObj) return;
    
    for (const [k, v] of Object.entries(currentObj)) {
      if (v === null || v === '' || (Array.isArray(v) && v.length === 0)) continue;
      
      const newKey = `${currentPrefix}${k}`.trim();
      
      if (typeof v === 'object' && !Array.isArray(v)) {
        recurse(v, `${newKey} `);
      } else {
        entries.push({ 
          k: newKey, 
          v: Array.isArray(v) ? v.join(', ') : v 
        });
      }
    }
  };
  
  recurse(obj, prefix);
  return entries;
};

/**
 * Traduce y formatea una clave técnica basada en el diccionario de traducciones.
 */
export const translateKey = (key) => {
  return key
    .split(' ')
    .filter(word => word.length > 0)
    .map(word => 
      SERVICE_TRANSLATIONS[word] || 
      word.charAt(0).toUpperCase() + word.slice(1).replace(/([A-Z])/g, ' $1').trim()
    )
    .join(' - ');
};

/**
 * Procesa los metadatos de un servicio para devolver una lista lista para mostrar en UI.
 */
export const formatServiceDetails = (details) => {
  if (!details) return [];
  const flatEntries = flattenObject(details);
  return flatEntries.map(e => ({
    k: translateKey(e.k),
    v: e.v
  }));
};
