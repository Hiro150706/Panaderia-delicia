/* dashboard-empleado.js - VERSIÓN CORREGIDA CON MANEJO DE ERRORES
   Panel de empleado con notificaciones y mejor manejo de errores RLS
*/

// ============================================
// CONFIGURACIÓN SUPABASE
// ============================================
const supabaseEmpleado = window.supabase ? window.supabase.createClient(
  'https://ntmqhlozwedzoaozjcvq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50bXFobG96d2Vkem9hb3pqY3ZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2NDE1OTcsImV4cCI6MjA4MDIxNzU5N30.kBFmWikurhhVZ2Qh6GwdaiO2wzdZgEH_GJ_sLbroRcA'
) : null;

// ============================================
// PROTECCIÓN DE RUTA Y AUTENTICACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Inicializando Dashboard Empleado...');
  
  if (!supabaseEmpleado) {
    console.error('❌ Error: Supabase no está disponible');
    alert('Error al inicializar la aplicación. Por favor recarga la página.');
    return;
  }
  
  if (!auth.requireAuth(['empleado', 'admin'])) {
    return;
  }

  const session = auth.getSession();
  document.getElementById('empleado-name').textContent = session.nombre || 'Empleado';
  document.getElementById('empleado-email').textContent = session.email;

  // Cargar datos iniciales
  loadPedidos();
  loadEstadisticas();
  checkPedidosPendientes();
});

// ============================================
// ALERTA DE PEDIDOS PENDIENTES
// ============================================
async function checkPedidosPendientes() {
  try {
    // Consulta simplificada sin relaciones problemáticas
    const { data: pedidosPendientes, error } = await supabaseEmpleado
      .from('pedidos')
      .select('id, estado, total, usuario_id')
      .in('estado', ['pendiente', 'confirmado'])
      .order('id', { ascending: false });

    if (error) {
      console.error('Error al verificar pedidos pendientes:', error);
      return;
    }

    if (pedidosPendientes && pedidosPendientes.length > 0) {
      // Obtener nombres de usuarios por separado
      const userIds = [...new Set(pedidosPendientes.map(p => p.usuario_id))];
      const { data: usuarios } = await supabaseEmpleado
        .from('usuarios')
        .select('id, nombre')
        .in('id', userIds);
      
      const userMap = {};
      if (usuarios) {
        usuarios.forEach(u => userMap[u.id] = u.nombre);
      }
      
      // Agregar nombres a pedidos
      pedidosPendientes.forEach(p => {
        p.usuarios = { nombre: userMap[p.usuario_id] || 'Cliente' };
      });
      
      mostrarAlertaPedidos(pedidosPendientes);
      playNotificationSound();
    }
  } catch (error) {
    console.error('Error al verificar pedidos pendientes:', error);
  }
}

function mostrarAlertaPedidos(pedidos) {
  // Evitar duplicados
  const alertaExistente = document.querySelector('.alert-pedidos-pendientes');
  if (alertaExistente) {
    alertaExistente.remove();
  }
  
  // Crear alerta flotante
  const alertDiv = document.createElement('div');
  alertDiv.className = 'alert alert-warning alert-dismissible fade show position-fixed alert-pedidos-pendientes';
  alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; max-width: 400px; box-shadow: 0 5px 15px rgba(0,0,0,0.3);';
  
  alertDiv.innerHTML = `
    <strong>🔔 ¡ATENCIÓN!</strong><br>
    Hay <strong>${pedidos.length}</strong> pedido(s) pendiente(s) de entregar:
    <ul class="mb-0 mt-2">
      ${pedidos.slice(0, 3).map(p => `
        <li>Pedido #${p.id} - ${p.usuarios?.nombre || 'Cliente'} - ${p.estado}</li>
      `).join('')}
      ${pedidos.length > 3 ? `<li><em>...y ${pedidos.length - 3} más</em></li>` : ''}
    </ul>
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  
  document.body.appendChild(alertDiv);
  
  // Auto-ocultar después de 10 segundos
  setTimeout(() => {
    if (alertDiv.parentElement) {
      alertDiv.remove();
    }
  }, 10000);
}

function playNotificationSound() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (error) {
    console.log('No se pudo reproducir sonido de notificación');
  }
}

// ============================================
// NAVEGACIÓN ENTRE SECCIONES
// ============================================
document.addEventListener('click', (e) => {
  const link = e.target.closest('[data-section]');
  if (link) {
    e.preventDefault();
    
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    
    const section = link.dataset.section;
    showSection(section);
  }
});

function showSection(section) {
  document.querySelectorAll('[id$="-section"]').forEach(s => s.style.display = 'none');
  
  const sectionEl = document.getElementById(`${section}-section`);
  if (sectionEl) {
    sectionEl.style.display = 'block';
    
    if (section === 'pedidos') {
      loadPedidos();
      loadEstadisticas();
      checkPedidosPendientes();
    } else if (section === 'productos') {
      loadProductosStock();
    }
  }
}

// ============================================
// CERRAR SESIÓN - MEJORADO
// ============================================
document.getElementById('logout-btn').addEventListener('click', (e) => {
  e.preventDefault();
  
  const confirmar = confirm('¿Seguro que deseas cerrar sesión?\n\nSe cerrarán todas las ventanas de la sesión actual.');
  
  if (confirmar) {
    console.log('🚪 Cerrando sesión...');
    
    // Limpiar todo el localStorage
    localStorage.clear();
    
    // Limpiar sessionStorage
    sessionStorage.clear();
    
    // Mostrar mensaje de despedida
    alert('✅ Sesión cerrada exitosamente. ¡Hasta pronto!');
    
    // Redirigir al login
    window.location.href = 'login.html';
    
    // Prevenir navegación hacia atrás
    window.history.pushState(null, '', window.location.href);
    window.onpopstate = function() {
      window.history.pushState(null, '', window.location.href);
    };
  }
});

// ============================================
// GESTIÓN DE PEDIDOS
// ============================================
async function loadEstadisticas() {
  try {
    // Consulta simplificada sin fecha_pedido
    const { data: pedidos, error } = await supabaseEmpleado
      .from('pedidos')
      .select('id, estado, total, created_at');

    if (error) {
      console.error('Error al cargar estadísticas:', error);
      // Establecer valores por defecto
      document.getElementById('stat-pendientes').textContent = '-';
      document.getElementById('stat-confirmados').textContent = '-';
      document.getElementById('stat-enviados').textContent = '-';
      document.getElementById('stat-entregados').textContent = '-';
      return;
    }

    if (!pedidos) {
      console.warn('No se obtuvieron pedidos');
      return;
    }

    const pendientes = pedidos.filter(p => p.estado === 'pendiente').length;
    const confirmados = pedidos.filter(p => p.estado === 'confirmado').length;
    const enviados = pedidos.filter(p => p.estado === 'enviado').length;
    
    // Calcular entregados hoy usando created_at
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const entregadosHoy = pedidos.filter(p => {
      if (p.estado !== 'entregado' || !p.created_at) return false;
      
      try {
        const fechaPedido = new Date(p.created_at);
        fechaPedido.setHours(0, 0, 0, 0);
        return fechaPedido.getTime() === hoy.getTime();
      } catch (e) {
        return false;
      }
    }).length;

    document.getElementById('stat-pendientes').textContent = pendientes;
    document.getElementById('stat-confirmados').textContent = confirmados;
    document.getElementById('stat-enviados').textContent = enviados;
    document.getElementById('stat-entregados').textContent = entregadosHoy;

    console.log('📊 Estadísticas actualizadas');
  } catch (error) {
    console.error('Error inesperado al cargar estadísticas:', error);
  }
}

async function loadPedidos() {
  try {
    console.log('📦 Cargando pedidos...');
    
    // Primera consulta: obtener pedidos
    const { data: pedidos, error } = await supabaseEmpleado
      .from('pedidos')
      .select('id, estado, total, metodo_pago, created_at, usuario_id')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error al cargar pedidos:', error);
      document.getElementById('pedidos-list').innerHTML = 
        '<div class="col-12 text-center text-danger"><p>⚠️ Error al cargar pedidos</p></div>';
      return;
    }

    if (!pedidos || pedidos.length === 0) {
      document.getElementById('pedidos-list').innerHTML = 
        '<div class="col-12 text-center text-muted"><p>No hay pedidos disponibles</p></div>';
      return;
    }

    // Segunda consulta: obtener usuarios
    const userIds = [...new Set(pedidos.map(p => p.usuario_id))];
    const { data: usuarios } = await supabaseEmpleado
      .from('usuarios')
      .select('id, nombre, email, telefono')
      .in('id', userIds);
    
    const userMap = {};
    if (usuarios) {
      usuarios.forEach(u => userMap[u.id] = u);
    }

    // Tercera consulta: obtener detalles de pedidos
    const pedidoIds = pedidos.map(p => p.id);
    const { data: detalles } = await supabaseEmpleado
      .from('detalle_pedidos')
      .select('pedido_id, cantidad, precio_unitario, subtotal, producto_id')
      .in('pedido_id', pedidoIds);
    
    // Cuarta consulta: obtener productos
    if (detalles && detalles.length > 0) {
      const productoIds = [...new Set(detalles.map(d => d.producto_id))];
      const { data: productos } = await supabaseEmpleado
        .from('productos')
        .select('id, nombre, imagen_url')
        .in('id', productoIds);
      
      const productoMap = {};
      if (productos) {
        productos.forEach(p => productoMap[p.id] = p);
      }
      
      // Agrupar detalles por pedido
      const detallesPorPedido = {};
      detalles.forEach(d => {
        if (!detallesPorPedido[d.pedido_id]) {
          detallesPorPedido[d.pedido_id] = [];
        }
        detallesPorPedido[d.pedido_id].push({
          ...d,
          productos: productoMap[d.producto_id]
        });
      });
      
      // Combinar toda la información
      pedidos.forEach(p => {
        p.usuarios = userMap[p.usuario_id] || { nombre: 'N/A', email: 'N/A' };
        p.detalle_pedidos = detallesPorPedido[p.id] || [];
      });
    } else {
      pedidos.forEach(p => {
        p.usuarios = userMap[p.usuario_id] || { nombre: 'N/A', email: 'N/A' };
        p.detalle_pedidos = [];
      });
    }

    const filtroEstado = document.getElementById('filter-estado')?.value || '';
    let pedidosFiltrados = pedidos;

    if (filtroEstado) {
      pedidosFiltrados = pedidos.filter(p => p.estado === filtroEstado);
    }

    renderPedidos(pedidosFiltrados);
    console.log(`✅ ${pedidosFiltrados.length} pedidos cargados`);
  } catch (error) {
    console.error('Error inesperado al cargar pedidos:', error);
    document.getElementById('pedidos-list').innerHTML = 
      '<div class="col-12 text-center text-danger"><p>Error inesperado al cargar pedidos</p></div>';
  }
}

function renderPedidos(pedidos) {
  const container = document.getElementById('pedidos-list');
  
  if (pedidos.length === 0) {
    container.innerHTML = '<div class="col-12 text-center text-muted"><p>No hay pedidos con ese filtro</p></div>';
    return;
  }

  let html = '';
  pedidos.forEach(pedido => {
    let fecha = 'Fecha no disponible';
    try {
      // Usar created_at en lugar de fecha_pedido
      if (pedido.created_at) {
        fecha = new Date(pedido.created_at).toLocaleDateString('es-PE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    } catch (e) {
      console.warn('Error al formatear fecha:', pedido.created_at);
    }

    const estadoBadge = getEstadoBadge(pedido.estado);
    const estadoColor = getEstadoColor(pedido.estado);
    const items = pedido.detalle_pedidos?.length || 0;
    
    // Resaltar pedidos pendientes
    const isPending = pedido.estado === 'pendiente' || pedido.estado === 'confirmado';
    const pulseClass = isPending ? 'border-3 shadow-lg' : '';

    html += `
      <div class="col-md-6 col-lg-4">
        <div class="card order-card h-100 border-${estadoColor} ${pulseClass}">
          <div class="card-header bg-${estadoColor} text-white">
            <div class="d-flex justify-content-between align-items-center">
              <strong>Pedido #${pedido.id}</strong>
              ${estadoBadge}
              ${isPending ? '<span class="badge bg-light text-danger ms-2">¡NUEVO!</span>' : ''}
            </div>
          </div>
          <div class="card-body">
            <p class="mb-2">
              <i class="fas fa-user"></i> 
              <strong>${pedido.usuarios?.nombre || 'N/A'}</strong>
            </p>
            <p class="mb-2 text-muted small">
              <i class="fas fa-envelope"></i> ${pedido.usuarios?.email || 'N/A'}
            </p>
            ${pedido.usuarios?.telefono ? `
              <p class="mb-2 text-muted small">
                <i class="fas fa-phone"></i> ${pedido.usuarios.telefono}
              </p>
            ` : ''}
            <hr>
            <p class="mb-2">
              <i class="fas fa-box"></i> ${items} producto${items !== 1 ? 's' : ''}
            </p>
            <p class="mb-2">
              <i class="fas fa-credit-card"></i> ${pedido.metodo_pago || 'N/A'}
            </p>
            <p class="mb-2">
              <i class="fas fa-calendar"></i> ${fecha}
            </p>
            <h4 class="text-primary mb-3">S/ ${parseFloat(pedido.total).toFixed(2)}</h4>
            
            <div class="d-grid gap-2">
              <button class="btn btn-sm btn-info" onclick="verDetallePedido(${pedido.id})">
                <i class="fas fa-eye"></i> Ver Detalle
              </button>
              <button class="btn btn-sm btn-primary" onclick="cambiarEstadoPedido(${pedido.id}, '${pedido.estado}')">
                <i class="fas fa-edit"></i> Cambiar Estado
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function getEstadoBadge(estado) {
  const badges = {
    'pendiente': '<span class="badge bg-warning text-dark">Pendiente</span>',
    'confirmado': '<span class="badge bg-success">Confirmado</span>',
    'enviado': '<span class="badge bg-info">Enviado</span>',
    'entregado': '<span class="badge bg-primary">Entregado</span>',
    'cancelado': '<span class="badge bg-danger">Cancelado</span>'
  };
  return badges[estado] || `<span class="badge bg-secondary">${estado}</span>`;
}

function getEstadoColor(estado) {
  const colores = {
    'pendiente': 'warning',
    'confirmado': 'success',
    'enviado': 'info',
    'entregado': 'primary',
    'cancelado': 'danger'
  };
  return colores[estado] || 'secondary';
}

window.verDetallePedido = async function(pedidoId) {
  try {
    // Obtener pedido con usuario
    const { data: pedido, error: pedidoError } = await supabaseEmpleado
      .from('pedidos')
      .select('*')
      .eq('id', pedidoId)
      .single();

    if (pedidoError) throw pedidoError;

    // Obtener usuario
    const { data: usuario } = await supabaseEmpleado
      .from('usuarios')
      .select('nombre, email, telefono, direccion')
      .eq('id', pedido.usuario_id)
      .single();
    
    pedido.usuarios = usuario || {};

    // Obtener detalles del pedido
    const { data: detalles } = await supabaseEmpleado
      .from('detalle_pedidos')
      .select('*')
      .eq('pedido_id', pedidoId);
    
    // Obtener productos
    if (detalles && detalles.length > 0) {
      const productoIds = detalles.map(d => d.producto_id);
      const { data: productos } = await supabaseEmpleado
        .from('productos')
        .select('id, nombre, imagen_url, precio')
        .in('id', productoIds);
      
      const productoMap = {};
      if (productos) {
        productos.forEach(p => productoMap[p.id] = p);
      }
      
      detalles.forEach(d => {
        d.productos = productoMap[d.producto_id] || {};
      });
      
      pedido.detalle_pedidos = detalles;
    } else {
      pedido.detalle_pedidos = [];
    }

    let fecha = 'Fecha no disponible';
    try {
      if (pedido.created_at) {
        fecha = new Date(pedido.created_at).toLocaleDateString('es-PE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    } catch (e) {
      console.warn('Error al formatear fecha');
    }

    let html = `
      <div class="mb-3">
        <h6>Información del Cliente:</h6>
        <p class="mb-1"><strong>Nombre:</strong> ${pedido.usuarios?.nombre || 'N/A'}</p>
        <p class="mb-1"><strong>Email:</strong> ${pedido.usuarios?.email || 'N/A'}</p>
        ${pedido.usuarios?.telefono ? `<p class="mb-1"><strong>Teléfono:</strong> ${pedido.usuarios.telefono}</p>` : ''}
        ${pedido.usuarios?.direccion ? `<p class="mb-1"><strong>Dirección:</strong> ${pedido.usuarios.direccion}</p>` : ''}
      </div>
      <hr>
      <div class="mb-3">
        <h6>Información del Pedido:</h6>
        <p class="mb-1"><strong>Fecha:</strong> ${fecha}</p>
        <p class="mb-1"><strong>Estado:</strong> ${getEstadoBadge(pedido.estado)}</p>
        <p class="mb-1"><strong>Método de Pago:</strong> ${pedido.metodo_pago || 'N/A'}</p>
      </div>
      <hr>
      <h6>Productos:</h6>
      <div class="table-responsive">
        <table class="table table-sm">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Cantidad</th>
              <th>Precio Unit.</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
    `;

    if (pedido.detalle_pedidos && pedido.detalle_pedidos.length > 0) {
      pedido.detalle_pedidos.forEach(d => {
        html += `
          <tr>
            <td>
              <div class="d-flex align-items-center gap-2">
                ${d.productos?.imagen_url ? 
                  `<img src="${d.productos.imagen_url}" class="product-img-small" alt="${d.productos.nombre}">` 
                  : ''
                }
                <span>${d.productos?.nombre || 'N/A'}</span>
              </div>
            </td>
            <td>${d.cantidad}</td>
            <td>S/ ${parseFloat(d.precio_unitario).toFixed(2)}</td>
            <td>S/ ${parseFloat(d.subtotal).toFixed(2)}</td>
          </tr>
        `;
      });
    }

    html += `
          </tbody>
          <tfoot>
            <tr>
              <th colspan="3" class="text-end">Total:</th>
              <th>S/ ${parseFloat(pedido.total).toFixed(2)}</th>
            </tr>
          </tfoot>
        </table>
      </div>
    `;

    document.getElementById('orderModalBody').innerHTML = html;
    document.getElementById('orderModalTitle').textContent = `Pedido #${pedido.id}`;
    
    const modal = new bootstrap.Modal(document.getElementById('orderModal'));
    modal.show();
  } catch (error) {
    console.error('Error al cargar detalle:', error);
    alert('Error al cargar el detalle del pedido');
  }
};

window.cambiarEstadoPedido = async function(pedidoId, estadoActual) {
  const estados = ['pendiente', 'confirmado', 'enviado', 'entregado', 'cancelado'];
  
  let opciones = `Estado actual: ${estadoActual.toUpperCase()}\n\nSeleccione el nuevo estado:\n\n`;
  estados.forEach((e, i) => {
    opciones += `${i + 1}. ${e.charAt(0).toUpperCase() + e.slice(1)}\n`;
  });
  opciones += '\nIngrese el número del estado:';

  const nuevoEstado = prompt(opciones);

  if (!nuevoEstado) return;

  const indice = parseInt(nuevoEstado) - 1;
  if (indice < 0 || indice >= estados.length) {
    alert('Opción inválida');
    return;
  }

  const estadoSeleccionado = estados[indice];

  try {
    const { error } = await supabaseEmpleado
      .from('pedidos')
      .update({ estado: estadoSeleccionado })
      .eq('id', pedidoId);

    if (error) throw error;

    alert(`✅ Estado actualizado a: ${estadoSeleccionado.toUpperCase()}`);
    loadPedidos();
    loadEstadisticas();
    checkPedidosPendientes();
  } catch (error) {
    console.error('Error al actualizar estado:', error);
    alert('Error al actualizar el estado del pedido');
  }
};

document.getElementById('filter-estado')?.addEventListener('change', () => {
  loadPedidos();
});

// ============================================
// GESTIÓN DE STOCK
// ============================================
async function loadProductosStock() {
  try {
    console.log('📦 Cargando productos...');
    
    const { data: productos, error } = await supabaseEmpleado
      .from('productos')
      .select('*')
      .order('stock', { ascending: true });

    if (error) {
      console.error('Error al cargar productos:', error);
      document.getElementById('productos-table').innerHTML = 
        '<div class="text-center text-danger"><p>⚠️ Error al cargar productos</p></div>';
      return;
    }

    const stockBajo = productos.filter(p => p.stock < 10 && p.activo);
    renderStockAlerts(stockBajo);

    renderProductosTable(productos);
    
    console.log(`✅ ${productos.length} productos cargados`);
  } catch (error) {
    console.error('Error inesperado al cargar productos:', error);
    document.getElementById('productos-table').innerHTML = 
      '<div class="text-center text-danger"><p>Error inesperado al cargar productos</p></div>';
  }
}

function renderStockAlerts(productos) {
  const container = document.getElementById('stock-alerts');
  
  if (productos.length === 0) {
    container.innerHTML = '';
    return;
  }

  let html = '<div class="alert alert-warning"><h6><i class="fas fa-exclamation-triangle"></i> Productos con Stock Bajo:</h6><ul class="mb-0">';
  
  productos.forEach(p => {
    html += `<li><strong>${p.nombre}</strong>: ${p.stock} unidades disponibles</li>`;
  });
  
  html += '</ul></div>';
  container.innerHTML = html;
}

function renderProductosTable(productos) {
  const container = document.getElementById('productos-table');
  
  if (productos.length === 0) {
    container.innerHTML = '<div class="text-center text-muted"><p>No hay productos</p></div>';
    return;
  }

  let html = `
    <table class="table table-hover">
      <thead>
        <tr>
          <th>Imagen</th>
          <th>Producto</th>
          <th>Categoría</th>
          <th>Precio</th>
          <th>Stock</th>
          <th>Estado</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
  `;

  productos.forEach(p => {
    const stockClass = p.stock === 0 ? 'text-danger fw-bold' : p.stock < 10 ? 'text-warning fw-bold' : p.stock < 20 ? 'text-info' : '';
    const activo = p.activo ? '<span class="badge bg-success">Activo</span>' : '<span class="badge bg-secondary">Inactivo</span>';
    
    html += `
      <tr>
        <td><img src="${p.imagen_url}" class="product-img-small" alt="${p.nombre}"></td>
        <td><strong>${p.nombre}</strong></td>
        <td>${p.categoria || 'N/A'}</td>
        <td>S/ ${parseFloat(p.precio).toFixed(2)}</td>
        <td class="${stockClass}">${p.stock}</td>
        <td>${activo}</td>
        <td>
          <button class="btn btn-sm btn-primary" onclick="actualizarStock(${p.id}, '${p.nombre}', ${p.stock})">
            <i class="fas fa-edit"></i> Stock
          </button>
        </td>
      </tr>
    `;
  });

  html += '</tbody></table>';
  container.innerHTML = html;
}

window.actualizarStock = function(productoId, nombre, stockActual) {
  document.getElementById('stock-product-id').value = productoId;
  document.getElementById('stock-product-name').value = nombre;
  document.getElementById('stock-current').value = stockActual;
  document.getElementById('stock-new').value = stockActual;

  const modal = new bootstrap.Modal(document.getElementById('stockModal'));
  modal.show();
};

document.getElementById('stockForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const productoId = document.getElementById('stock-product-id').value;
  const nuevoStock = parseInt(document.getElementById('stock-new').value);

  if (nuevoStock < 0) {
    alert('El stock no puede ser negativo');
    return;
  }

  try {
    const { error } = await supabaseEmpleado
      .from('productos')
      .update({ stock: nuevoStock })
      .eq('id', productoId);

    if (error) throw error;

    alert('✅ Stock actualizado exitosamente');
    bootstrap.Modal.getInstance(document.getElementById('stockModal')).hide();
    loadProductosStock();
  } catch (error) {
    console.error('Error al actualizar stock:', error);
    alert('Error al actualizar el stock');
  }
});

// Recargar pedidos cada 30 segundos para detectar nuevos
setInterval(() => {
  if (document.getElementById('pedidos-section').style.display !== 'none') {
    checkPedidosPendientes();
    loadEstadisticas();
  }
}, 30000);

console.log('✅ Dashboard Empleado inicializado');