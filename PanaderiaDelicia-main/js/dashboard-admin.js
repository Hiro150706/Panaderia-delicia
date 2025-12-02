/* dashboard-admin.js - VERSIÓN CON ALERTAS DE PEDIDOS PENDIENTES
   Panel de administración completo con notificaciones
*/

// Configuración Supabase
const SUPABASE_URL = 'https://ntmqhlozwedzoaozjcvq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50bXFobG96d2Vkem9hb3pqY3ZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2NDE1OTcsImV4cCI6MjA4MDIxNzU5N30.kBFmWikurhhVZ2Qh6GwdaiO2wzdZgEH_GJ_sLbroRcA';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================
// PROTECCIÓN DE RUTA
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  if (!auth.requireAuth(['admin'])) {
    return;
  }

  const session = auth.getSession();
  document.getElementById('admin-name').textContent = session.nombre || 'Admin';
  document.getElementById('admin-email').textContent = session.email;

  initDashboard();
  checkPedidosPendientes(); // Nueva función de alertas
});

// ============================================
// ALERTA DE PEDIDOS PENDIENTES
// ============================================
async function checkPedidosPendientes() {
  try {
    const { data: pedidosPendientes, error } = await supabase
      .from('pedidos')
      .select('*, usuarios(nombre)')
      .in('estado', ['pendiente', 'confirmado'])
      .order('fecha_pedido', { ascending: true });

    if (error) throw error;

    if (pedidosPendientes && pedidosPendientes.length > 0) {
      mostrarAlertaPedidos(pedidosPendientes);
      playNotificationSound();
    }
  } catch (error) {
    console.error('Error al verificar pedidos pendientes:', error);
  }
}

function mostrarAlertaPedidos(pedidos) {
  // Crear alerta flotante
  const alertDiv = document.createElement('div');
  alertDiv.className = 'alert alert-danger alert-dismissible fade show position-fixed';
  alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; max-width: 450px; box-shadow: 0 8px 20px rgba(0,0,0,0.4);';
  
  alertDiv.innerHTML = `
    <h5 class="alert-heading"><i class="fas fa-bell"></i> ¡PEDIDOS PENDIENTES!</h5>
    <strong>Hay ${pedidos.length} pedido(s) que requieren atención:</strong>
    <ul class="mb-2 mt-2">
      ${pedidos.slice(0, 5).map(p => `
        <li>
          <strong>Pedido #${p.id}</strong> - ${p.usuarios?.nombre || 'Cliente'} 
          <span class="badge bg-warning text-dark">${p.estado}</span>
        </li>
      `).join('')}
      ${pedidos.length > 5 ? `<li><em>...y ${pedidos.length - 5} pedidos más</em></li>` : ''}
    </ul>
    <button type="button" class="btn btn-sm btn-light" onclick="document.querySelector('[data-section=pedidos]').click()">
      Ver todos los pedidos
    </button>
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  
  document.body.appendChild(alertDiv);
  
  // Auto-ocultar después de 15 segundos
  setTimeout(() => {
    if (alertDiv.parentElement) {
      alertDiv.remove();
    }
  }, 15000);
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
// NAVEGACIÓN
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
    
    switch(section) {
      case 'dashboard':
        loadDashboardStats();
        checkPedidosPendientes();
        break;
      case 'productos':
        loadProductos();
        break;
      case 'pedidos':
        loadPedidos();
        checkPedidosPendientes();
        break;
      case 'usuarios':
        loadUsuarios();
        break;
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
    console.log('🚪 Cerrando sesión de administrador...');
    
    // Limpiar todo el localStorage
    localStorage.clear();
    
    // Limpiar sessionStorage
    sessionStorage.clear();
    
    // Mostrar mensaje de despedida
    alert('✅ Sesión cerrada exitosamente. ¡Hasta pronto, Administrador!');
    
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
// DASHBOARD STATS
// ============================================
async function loadDashboardStats() {
  try {
    // Pedidos
    const { data: pedidos, error: pedidosError } = await supabase
      .from('pedidos')
      .select('*');
    
    if (pedidosError) throw pedidosError;
    
    document.getElementById('stat-pedidos').textContent = pedidos.length;
    
    const totalVentas = pedidos.reduce((sum, p) => sum + parseFloat(p.total || 0), 0);
    document.getElementById('stat-ventas').textContent = `S/ ${totalVentas.toFixed(2)}`;

    // Productos
    const { data: productos, error: productosError } = await supabase
      .from('productos')
      .select('*');
    
    if (productosError) throw productosError;
    document.getElementById('stat-productos').textContent = productos.length;

    // Usuarios
    const { data: usuarios, error: usuariosError } = await supabase
      .from('usuarios')
      .select('*');
    
    if (usuariosError) throw usuariosError;
    document.getElementById('stat-usuarios').textContent = usuarios.length;

    // Últimos pedidos
    loadRecentOrders();
  } catch (error) {
    console.error('Error al cargar estadísticas:', error);
  }
}

async function loadRecentOrders() {
  try {
    const { data: pedidos, error } = await supabase
      .from('pedidos')
      .select(`
        *,
        usuarios(nombre, email)
      `)
      .order('fecha_pedido', { ascending: false })
      .limit(5);

    if (error) throw error;

    let html = `
      <table class="table table-hover">
        <thead>
          <tr>
            <th>#ID</th>
            <th>Cliente</th>
            <th>Total</th>
            <th>Estado</th>
            <th>Fecha</th>
          </tr>
        </thead>
        <tbody>
    `;

    pedidos.forEach(p => {
      const fecha = new Date(p.fecha_pedido).toLocaleDateString('es-PE');
      const estadoBadge = getEstadoBadge(p.estado);
      
      html += `
        <tr>
          <td>#${p.id}</td>
          <td>${p.usuarios?.nombre || 'N/A'}</td>
          <td>S/ ${parseFloat(p.total).toFixed(2)}</td>
          <td>${estadoBadge}</td>
          <td>${fecha}</td>
        </tr>
      `;
    });

    html += '</tbody></table>';
    document.getElementById('recent-orders').innerHTML = html;
  } catch (error) {
    console.error('Error al cargar pedidos recientes:', error);
  }
}

function getEstadoBadge(estado) {
  const badges = {
    'pendiente': '<span class="badge bg-warning">Pendiente</span>',
    'confirmado': '<span class="badge bg-success">Confirmado</span>',
    'enviado': '<span class="badge bg-info">Enviado</span>',
    'entregado': '<span class="badge bg-primary">Entregado</span>',
    'cancelado': '<span class="badge bg-danger">Cancelado</span>'
  };
  return badges[estado] || `<span class="badge bg-secondary">${estado}</span>`;
}

// ============================================
// PRODUCTOS
// ============================================
async function loadProductos() {
  try {
    const { data: productos, error } = await supabase
      .from('productos')
      .select('*')
      .order('id', { ascending: true });

    if (error) throw error;

    let html = `
      <table class="table table-hover">
        <thead>
          <tr>
            <th>Imagen</th>
            <th>Nombre</th>
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
      const activo = p.activo ? '<span class="badge bg-success">Activo</span>' : '<span class="badge bg-secondary">Inactivo</span>';
      const stockClass = p.stock < 10 ? 'text-danger fw-bold' : p.stock < 20 ? 'text-warning' : '';
      
      html += `
        <tr>
          <td><img src="${p.imagen_url}" class="product-img-table" alt="${p.nombre}"></td>
          <td>${p.nombre}</td>
          <td>${p.categoria || 'N/A'}</td>
          <td>S/ ${parseFloat(p.precio).toFixed(2)}</td>
          <td class="${stockClass}">${p.stock}</td>
          <td>${activo}</td>
          <td class="table-actions">
            <button class="btn btn-sm btn-primary edit-product" data-id="${p.id}">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm ${p.activo ? 'btn-warning' : 'btn-success'} toggle-product" data-id="${p.id}" data-activo="${p.activo}">
              <i class="fas fa-${p.activo ? 'eye-slash' : 'eye'}"></i>
            </button>
            <button class="btn btn-sm btn-danger delete-product" data-id="${p.id}">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        </tr>
      `;
    });

    html += '</tbody></table>';
    document.getElementById('productos-table').innerHTML = html;

    attachProductListeners();
  } catch (error) {
    console.error('Error al cargar productos:', error);
  }
}

function attachProductListeners() {
  document.querySelectorAll('.edit-product').forEach(btn => {
    btn.addEventListener('click', () => editProduct(btn.dataset.id));
  });

  document.querySelectorAll('.toggle-product').forEach(btn => {
    btn.addEventListener('click', () => toggleProduct(btn.dataset.id, btn.dataset.activo === 'true'));
  });

  document.querySelectorAll('.delete-product').forEach(btn => {
    btn.addEventListener('click', () => deleteProduct(btn.dataset.id));
  });
}

async function editProduct(id) {
  try {
    const { data: product, error } = await supabase
      .from('productos')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    document.getElementById('productModalTitle').textContent = 'Editar Producto';
    document.getElementById('product-id').value = product.id;
    document.getElementById('product-nombre').value = product.nombre;
    document.getElementById('product-descripcion').value = product.descripcion;
    document.getElementById('product-precio').value = product.precio;
    document.getElementById('product-stock').value = product.stock;
    document.getElementById('product-imagen').value = product.imagen_url;
    document.getElementById('product-categoria').value = product.categoria || 'Panes';

    new bootstrap.Modal(document.getElementById('productModal')).show();
  } catch (error) {
    console.error('Error al cargar producto:', error);
    alert('Error al cargar el producto');
  }
}

async function toggleProduct(id, isActive) {
  try {
    const { error } = await supabase
      .from('productos')
      .update({ activo: !isActive })
      .eq('id', id);

    if (error) throw error;

    alert(`Producto ${!isActive ? 'activado' : 'desactivado'} exitosamente`);
    loadProductos();
  } catch (error) {
    console.error('Error al cambiar estado:', error);
    alert('Error al cambiar estado del producto');
  }
}

async function deleteProduct(id) {
  if (!confirm('¿Seguro que deseas eliminar este producto?')) return;

  try {
    const { error } = await supabase
      .from('productos')
      .delete()
      .eq('id', id);

    if (error) throw error;

    alert('Producto eliminado exitosamente');
    loadProductos();
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    alert('Error al eliminar el producto');
  }
}

document.getElementById('productForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = document.getElementById('product-id').value;
  const productData = {
    nombre: document.getElementById('product-nombre').value.trim(),
    descripcion: document.getElementById('product-descripcion').value.trim(),
    precio: parseFloat(document.getElementById('product-precio').value),
    stock: parseInt(document.getElementById('product-stock').value),
    imagen_url: document.getElementById('product-imagen').value.trim(),
    categoria: document.getElementById('product-categoria').value,
    activo: true
  };

  try {
    if (id) {
      const { error } = await supabase
        .from('productos')
        .update(productData)
        .eq('id', id);

      if (error) throw error;
      alert('Producto actualizado exitosamente');
    } else {
      const { error } = await supabase
        .from('productos')
        .insert(productData);

      if (error) throw error;
      alert('Producto creado exitosamente');
    }

    bootstrap.Modal.getInstance(document.getElementById('productModal')).hide();
    document.getElementById('productForm').reset();
    loadProductos();
  } catch (error) {
    console.error('Error al guardar producto:', error);
    alert('Error al guardar el producto');
  }
});

document.getElementById('productModal').addEventListener('hidden.bs.modal', () => {
  document.getElementById('productForm').reset();
  document.getElementById('product-id').value = '';
  document.getElementById('productModalTitle').textContent = 'Nuevo Producto';
});

// ============================================
// PEDIDOS
// ============================================
async function loadPedidos() {
  try {
    const { data: pedidos, error } = await supabase
      .from('pedidos')
      .select(`
        *,
        usuarios(nombre, email),
        detalle_pedidos(*, productos(nombre))
      `)
      .order('fecha_pedido', { ascending: false });

    if (error) throw error;

    let html = `
      <table class="table table-hover">
        <thead>
          <tr>
            <th>#ID</th>
            <th>Cliente</th>
            <th>Items</th>
            <th>Total</th>
            <th>Método Pago</th>
            <th>Estado</th>
            <th>Fecha</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
    `;

    pedidos.forEach(p => {
      const fecha = new Date(p.fecha_pedido).toLocaleDateString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      const items = p.detalle_pedidos?.length || 0;
      const isPending = p.estado === 'pendiente' || p.estado === 'confirmado';
      const rowClass = isPending ? 'table-warning' : '';
      
      html += `
        <tr class="${rowClass}">
          <td><strong>#${p.id}</strong></td>
          <td>${p.usuarios?.nombre || 'N/A'}<br><small class="text-muted">${p.usuarios?.email || ''}</small></td>
          <td>${items} productos</td>
          <td>S/ ${parseFloat(p.total).toFixed(2)}</td>
          <td>${p.metodo_pago || 'N/A'}</td>
          <td>${getEstadoBadge(p.estado)}</td>
          <td>${fecha}</td>
          <td>
            <button class="btn btn-sm btn-info view-order" data-pedido='${JSON.stringify(p).replace(/'/g, "&#39;")}'>
              <i class="fas fa-eye"></i>
            </button>
            <button class="btn btn-sm btn-success change-status" data-id="${p.id}" data-estado="${p.estado}">
              <i class="fas fa-edit"></i>
            </button>
          </td>
        </tr>
      `;
    });

    html += '</tbody></table>';
    document.getElementById('pedidos-table').innerHTML = html;

    document.querySelectorAll('.view-order').forEach(btn => {
      btn.addEventListener('click', () => {
        const pedido = JSON.parse(btn.dataset.pedido);
        viewOrderDetails(pedido);
      });
    });

    document.querySelectorAll('.change-status').forEach(btn => {
      btn.addEventListener('click', () => {
        changeOrderStatus(parseInt(btn.dataset.id), btn.dataset.estado);
      });
    });
  } catch (error) {
    console.error('Error al cargar pedidos:', error);
  }
}

function viewOrderDetails(pedido) {
  const fecha = new Date(pedido.fecha_pedido).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  let details = `
DETALLES DEL PEDIDO #${pedido.id}
═══════════════════════════════

CLIENTE:
• Nombre: ${pedido.usuarios?.nombre || 'N/A'}
• Email: ${pedido.usuarios?.email || 'N/A'}

PEDIDO:
• Fecha: ${fecha}
• Estado: ${pedido.estado.toUpperCase()}
• Método de Pago: ${pedido.metodo_pago || 'N/A'}
• Total: S/ ${parseFloat(pedido.total).toFixed(2)}

PRODUCTOS:
`;

  if (pedido.detalle_pedidos && pedido.detalle_pedidos.length > 0) {
    pedido.detalle_pedidos.forEach(d => {
      details += `
• ${d.productos?.nombre || 'N/A'}
  Cantidad: ${d.cantidad}
  Precio unit.: S/ ${parseFloat(d.precio_unitario).toFixed(2)}
  Subtotal: S/ ${parseFloat(d.subtotal).toFixed(2)}
`;
    });
  }

  alert(details);
}

async function changeOrderStatus(pedidoId, estadoActual) {
  const estados = ['pendiente', 'confirmado', 'enviado', 'entregado', 'cancelado'];
  const nuevoEstado = prompt(`Estado actual: ${estadoActual}\n\nNuevo estado (${estados.join(', ')}):`);
  
  if (!nuevoEstado || !estados.includes(nuevoEstado)) {
    return;
  }

  try {
    const { error } = await supabase
      .from('pedidos')
      .update({ estado: nuevoEstado })
      .eq('id', pedidoId);

    if (error) throw error;

    alert('Estado actualizado exitosamente');
    loadPedidos();
    checkPedidosPendientes();
  } catch (error) {
    console.error('Error al actualizar estado:', error);
    alert('Error al actualizar el estado');
  }
}

// ============================================
// USUARIOS
// ============================================
async function loadUsuarios() {
  try {
    const { data: usuarios, error } = await supabase
      .from('usuarios')
      .select('*')
      .order('id', { ascending: true });

    if (error) throw error;

    let html = `
      <table class="table table-hover">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Email</th>
            <th>Teléfono</th>
            <th>Rol</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
    `;

    usuarios.forEach(u => {
      const rolBadge = getRolBadge(u.rol);
      const activo = u.activo ? '<span class="badge bg-success">Activo</span>' : '<span class="badge bg-secondary">Inactivo</span>';
      
      html += `
        <tr>
          <td>${u.nombre || 'N/A'}</td>
          <td>${u.email}</td>
          <td>${u.telefono || 'N/A'}</td>
          <td>${rolBadge}</td>
          <td>${activo}</td>
          <td class="table-actions">
            <button class="btn btn-sm btn-primary edit-user" data-id="${u.id}">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm ${u.activo ? 'btn-warning' : 'btn-success'} toggle-user" data-id="${u.id}" data-activo="${u.activo}">
              <i class="fas fa-${u.activo ? 'ban' : 'check'}"></i>
            </button>
          </td>
        </tr>
      `;
    });

    html += '</tbody></table>';
    document.getElementById('usuarios-table').innerHTML = html;

    attachUserListeners();
  } catch (error) {
    console.error('Error al cargar usuarios:', error);
  }
}

function getRolBadge(rol) {
  const badges = {
    'admin': '<span class="badge badge-admin">Administrador</span>',
    'empleado': '<span class="badge badge-empleado">Empleado</span>',
    'cliente': '<span class="badge badge-cliente">Cliente</span>'
  };
  return badges[rol] || `<span class="badge bg-secondary">${rol}</span>`;
}

function attachUserListeners() {
  document.querySelectorAll('.edit-user').forEach(btn => {
    btn.addEventListener('click', () => editUser(btn.dataset.id));
  });

  document.querySelectorAll('.toggle-user').forEach(btn => {
    btn.addEventListener('click', () => toggleUser(btn.dataset.id, btn.dataset.activo === 'true'));
  });
}

async function editUser(id) {
  try {
    const { data: user, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    document.getElementById('userModalTitle').textContent = 'Editar Usuario';
    document.getElementById('user-id').value = user.id;
    document.getElementById('user-nombre').value = user.nombre || '';
    document.getElementById('user-email').value = user.email;
    document.getElementById('user-telefono').value = user.telefono || '';
    document.getElementById('user-rol').value = user.rol;

    new bootstrap.Modal(document.getElementById('userModal')).show();
  } catch (error) {
    console.error('Error al cargar usuario:', error);
    alert('Error al cargar el usuario');
  }
}

async function toggleUser(id, isActive) {
  try {
    const { error } = await supabase
      .from('usuarios')
      .update({ activo: !isActive })
      .eq('id', id);

    if (error) throw error;

    alert(`Usuario ${!isActive ? 'activado' : 'desactivado'} exitosamente`);
    loadUsuarios();
  } catch (error) {
    console.error('Error al cambiar estado:', error);
    alert('Error al cambiar estado del usuario');
  }
}

document.getElementById('userForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = document.getElementById('user-id').value;
  const password = document.getElementById('user-password').value.trim();
  
  const userData = {
    nombre: document.getElementById('user-nombre').value.trim(),
    email: document.getElementById('user-email').value.trim(),
    telefono: document.getElementById('user-telefono').value.trim(),
    rol: document.getElementById('user-rol').value,
    activo: true
  };

  if (password) {
    userData.password = password;
  }

  try {
    if (id) {
      const { error } = await supabase
        .from('usuarios')
        .update(userData)
        .eq('id', id);

      if (error) throw error;
      alert('Usuario actualizado exitosamente');
    } else {
      if (!password) {
        alert('La contraseña es requerida para nuevos usuarios');
        return;
      }
      
      const { error } = await supabase
        .from('usuarios')
        .insert(userData);

      if (error) throw error;
      alert('Usuario creado exitosamente');
    }

    bootstrap.Modal.getInstance(document.getElementById('userModal')).hide();
    document.getElementById('userForm').reset();
    loadUsuarios();
  } catch (error) {
    console.error('Error al guardar usuario:', error);
    alert('Error al guardar el usuario');
  }
});

document.getElementById('userModal').addEventListener('hidden.bs.modal', () => {
  document.getElementById('userForm').reset();
  document.getElementById('user-id').value = '';
  document.getElementById('userModalTitle').textContent = 'Nuevo Usuario';
});

// ============================================
// INICIALIZACIÓN
// ============================================
function initDashboard() {
  loadDashboardStats();
}

// Recargar pedidos cada 30 segundos para detectar nuevos
setInterval(() => {
  if (document.getElementById('dashboard-section').style.display !== 'none' ||
      document.getElementById('pedidos-section').style.display !== 'none') {
    checkPedidosPendientes();
  }
}, 30000);

console.log('✅ Dashboard Admin inicializado');