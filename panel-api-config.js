// ================================
// ðŸ”Œ CONFIGURACIÃ“N API - PANEL ADMIN
// ================================
// Incluye esto en panel-admin.html

const PANEL_API_CONFIG = {
  BASE_URL: window.PRODUCERS_GO_CONFIG?.API_BASE_URL || 'http://localhost:5000/api',
  TIMEOUT: 10000
};

// ================================
// OBTENER SOLICITUDES DE API
// ================================

async function obtenerAplicantesDeAPI(filtros = {}) {
  try {
    console.log('ðŸ“¥ Obteniendo solicitudes de API...');

    let url = `${PANEL_API_CONFIG.BASE_URL}/aplicantes?`;

    if (filtros.estado) url += `estado=${filtros.estado}&`;
    if (filtros.modelo) url += `modelo=${filtros.modelo}&`;
    if (filtros.buscar) url += `buscar=${filtros.buscar}&`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    console.log(`âœ… ${result.total} solicitudes obtenidas`);
    return result.data;

  } catch (error) {
    console.error('âŒ Error obteniendo de API:', error);

    // Fallback a localStorage
    console.log('âš ï¸ Usando datos de localStorage como backup...');
    return JSON.parse(localStorage.getItem('pg_applications')) || [];
  }
}

// ================================
// OBTENER ESTADÃSTICAS
// ================================

async function obtenerEstadisticas() {
  try {
    console.log('ðŸ“Š Obteniendo estadÃ­sticas...');

    const response = await fetch(`${PANEL_API_CONFIG.BASE_URL}/estadisticas`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    console.log('âœ… EstadÃ­sticas obtenidas:', result.data);
    return result.data;

  } catch (error) {
    console.error('âŒ Error obteniendo estadÃ­sticas:', error);
    return null;
  }
}

// ================================
// ACTUALIZAR ESTADO
// ================================

async function actualizarEstado(id, nuevoEstado, notas = '') {
  try {
    console.log(`ðŸ”„ Actualizando estado de ${id} a ${nuevoEstado}...`);

    const response = await fetch(`${PANEL_API_CONFIG.BASE_URL}/aplicantes/${id}/estado`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        estado: nuevoEstado,
        notas: notas
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    console.log('âœ… Estado actualizado');
    return result;

  } catch (error) {
    console.error('âŒ Error actualizando estado:', error);
    return null;
  }
}

// ================================
// OBTENER UNA SOLICITUD
// ================================

async function obtenerAplicante(id) {
  try {
    const response = await fetch(`${PANEL_API_CONFIG.BASE_URL}/aplicantes/${id}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    return result.data;

  } catch (error) {
    console.error('Error obteniendo solicitud:', error);
    return null;
  }
}

// ================================
// EXPORTAR CSV DESDE API
// ================================

async function exportarCSVDesdeAPI() {
  try {
    console.log('ðŸ“¥ Descargando CSV desde API...');

    const response = await fetch(`${PANEL_API_CONFIG.BASE_URL}/exportar-csv`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const csv = await response.text();

    // Descargar archivo
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `aplicantes_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    console.log('âœ… CSV descargado');

  } catch (error) {
    console.error('âŒ Error descargando CSV:', error);
  }
}

// ================================
// CARGAR DATOS Y MOSTRAR
// ================================

async function cargarYMostrarDatos() {
  try {
    // Obtener datos
    const aplicantes = await obtenerAplicantesDeAPI();
    const estadisticas = await obtenerEstadisticas();

    // Mostrar datos
    if (aplicantes && aplicantes.length > 0) {
      mostrarTabla(aplicantes);
    }

    if (estadisticas) {
      mostrarEstadisticas(estadisticas);
    }

  } catch (error) {
    console.error('Error cargando datos:', error);
  }
}

// ================================
// FUNCIONES HELPER (STUB)
// ================================

function mostrarTabla(datos) {
  console.log('ðŸ“Š Mostrando tabla con', datos.length, 'registros');
  // Implementar en panel-admin.html
}

function mostrarEstadisticas(datos) {
  console.log('ðŸ“ˆ Mostrando estadÃ­sticas');
  // Implementar en panel-admin.html
}

// ================================
// EXPORTAR
// ================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PANEL_API_CONFIG,
    obtenerAplicantesDeAPI,
    obtenerEstadisticas,
    actualizarEstado,
    obtenerAplicante,
    exportarCSVDesdeAPI,
    cargarYMostrarDatos
  };
}
