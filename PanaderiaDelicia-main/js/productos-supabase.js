/* productos-supabase.js - VERSIÓN MEJORADA
   Sistema con solicitud de registro antes de comprar
*/

// ============================================
// CONFIGURACIÓN DE SUPABASE
// ============================================
const supabaseClient = window.supabase ? window.supabase.createClient(
  'https://ntmqhlozwedzoaozjcvq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50bXFobG96d2Vkem9hb3pqY3ZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2NDE1OTcsImV4cCI6MjA4MDIxNzU5N30.kBFmWikurhhVZ2Qh6GwdaiO2wzdZgEH_GJ_sLbroRcA'
) : null;

// ============================================
// GESTIÓN DEL CARRITO
// ============================================
const CART_KEY = 'cart';
let cart = [];

function loadCart() {
  try {
    const stored = localStorage.getItem(CART_KEY);
    cart = stored ? JSON.parse(stored) : [];
    console.log('🛒 Carrito cargado:', cart);
    return cart;
  } catch (error) {
    console.error('Error al cargar carrito:', error);
    cart = [];
    return cart;
  }
}

function saveCart() {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    console.log('💾 Carrito guardado:', cart);
  } catch (error) {
    console.error('Error al guardar carrito:', error);
  }
}

function updateCartCount() {
  const countEl = document.getElementById('cart-count');
  if (countEl) {
    const count = cart.reduce((acc, i) => acc + (i.quantity || 0), 0);
    countEl.textContent = count;
    console.log('🔢 Contador actualizado:', count);
  }
}

function showToast(message, isError = false) {
  const toastBody = document.getElementById('toast-body');
  const toastEl = document.getElementById('liveToast');
  if (!toastBody || !toastEl) {
    alert(message);
    return;
  }
  toastBody.textContent = message;
  toastEl.className = isError 
    ? 'toast align-items-center text-white bg-danger border-0'
    : 'toast align-items-center text-white bg-rosado border-0';
  const toast = new bootstrap.Toast(toastEl);
  toast.show();
}

// ============================================
// FUNCIONES DE PRODUCTOS
// ============================================

async function getProducts() {
  try {
    const { data, error } = await supabaseClient
      .from('productos')
      .select('*')
      .eq('activo', true)
      .order('id', { ascending: true });

    if (error) throw error;
    console.log('📦 Productos obtenidos:', data);
    return data || [];
  } catch (error) {
    console.error('Error al obtener productos:', error);
    showToast('Error al cargar productos', true);
    return [];
  }
}

async function getProductById(id) {
  try {
    const { data, error } = await supabaseClient
      .from('productos')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error al obtener producto:', error);
    return null;
  }
}

// ============================================
// RENDERIZAR PRODUCTOS
// ============================================
async function renderProducts() {
  const productList = document.getElementById('product-list');
  if (!productList) {
    console.log('⚠️ No se encontró product-list');
    return;
  }

  console.log('🎨 Renderizando productos...');
  productList.innerHTML = '<div class="col-12 text-center"><div class="spinner-border text-rosado" role="status"><span class="visually-hidden">Cargando...</span></div></div>';

  const products = await getProducts();

  if (products.length === 0) {
    productList.innerHTML = '<div class="col-12 text-center text-muted"><p>No hay productos disponibles</p></div>';
    return;
  }

  let html = '';
  products.forEach((product, index) => {
    const stockClass = product.stock < 10 ? 'text-danger' : product.stock < 20 ? 'text-warning' : 'text-muted';
    const stockText = product.stock === 0 ? 'AGOTADO' : `Stock: ${product.stock}`;
    const buttonDisabled = product.stock === 0 ? 'disabled' : '';
    
    html += `
      <div class="col-md-4" data-aos="fade-up" data-aos-delay="${index * 100}">
        <div class="card h-100 product-card ${product.stock === 0 ? 'opacity-75' : ''}">
          <img src="${product.imagen_url}" class="card-img-top" alt="${product.nombre}" style="height: 250px; object-fit: cover;">
          <div class="card-body text-center">
            <h5 class="card-title">${product.nombre}</h5>
            <p class="card-text">${product.descripcion.substring(0, 80)}...</p>
            <p class="fw-bold fs-5">S/ ${parseFloat(product.precio).toFixed(2)}</p>
            <p class="${stockClass} small fw-semibold mb-3">${stockText} unidades</p>
            <button 
              class="btn btn-rosado view-detail" 
              data-id="${product.id}"
              data-name="${product.nombre}"
              data-price="${product.precio}"
              data-img="${product.imagen_url}"
              data-desc="${product.descripcion}"
              data-stock="${product.stock}"
              ${buttonDisabled}>
              ${product.stock === 0 ? 'Agotado' : 'Agregar al Carrito'}
            </button>
          </div>
        </div>
      </div>
    `;
  });

  productList.innerHTML = html;
  console.log('✅ Productos renderizados:', products.length);

  if (typeof AOS !== 'undefined') {
    AOS.refresh();
  }

  attachProductListeners();
}

function attachProductListeners() {
  document.querySelectorAll('.view-detail').forEach(btn => {
    btn.addEventListener('click', async () => {
      const modalEl = document.getElementById('productModal');
      if (!modalEl) return;

      const productId = btn.dataset.id;
      const name = btn.dataset.name;
      const price = parseFloat(btn.dataset.price);
      const img = btn.dataset.img;
      const desc = btn.dataset.desc;
      const stock = parseInt(btn.dataset.stock);

      if (stock === 0) {
        showToast('Producto agotado', true);
        return;
      }

      document.getElementById('modalTitle').textContent = name;
      document.getElementById('modalPrice').textContent = price.toFixed(2);
      document.getElementById('modalImg').src = img;
      document.getElementById('modalDesc').textContent = desc;
      
      const qtyInput = document.getElementById('modalQty');
      qtyInput.value = 1;
      qtyInput.max = stock;

      const modalBody = document.querySelector('#productModal .modal-body');
      let stockInfo = modalBody.querySelector('.stock-info');
      if (!stockInfo) {
        stockInfo = document.createElement('p');
        stockInfo.className = 'stock-info small mt-2';
        modalBody.appendChild(stockInfo);
      }
      
      const stockClass = stock < 10 ? 'text-danger fw-bold' : 'text-muted';
      stockInfo.className = `stock-info small mt-2 ${stockClass}`;
      stockInfo.textContent = `Stock disponible: ${stock} unidades`;

      const modal = new bootstrap.Modal(modalEl);
      modal.show();

      const addBtn = document.getElementById('addToCartBtn');
      const existingHandler = addBtn._handler;
      if (existingHandler) addBtn.removeEventListener('click', existingHandler);

      const handler = async () => {
        const qty = parseInt(qtyInput.value) || 1;

        if (qty > stock) {
          showToast(`Solo hay ${stock} unidades disponibles`, true);
          return;
        }

        const currentProduct = await getProductById(productId);
        if (!currentProduct || currentProduct.stock < qty) {
          showToast('Stock insuficiente. El producto se ha actualizado.', true);
          await renderProducts();
          modal.hide();
          return;
        }

        addToCart({ id: productId, name, price, img, stock }, qty);
        modal.hide();
      };

      addBtn.addEventListener('click', handler);
      addBtn._handler = handler;
    });
  });
}

// ============================================
// CARRITO
// ============================================
function addToCart(product, qty = 1) {
  qty = parseInt(qty) || 1;

  const existing = cart.find(i => i.id === product.id);
  if (existing) {
    const newQty = existing.quantity + qty;
    if (newQty > product.stock) {
      showToast(`Solo hay ${product.stock} unidades disponibles`, true);
      return;
    }
    existing.quantity = newQty;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: parseFloat(product.price),
      img: product.img,
      quantity: qty
    });
  }

  saveCart();
  updateCartCount();
  renderCartItems();
  showToast(`${product.name} agregado al carrito (${qty})`);
  window.dispatchEvent(new Event('cartUpdated'));
}

function renderCartItems() {
  const list = document.getElementById('cart-items');
  const totalEl = document.getElementById('cart-total') || document.getElementById('total');

  if (!list) return;

  if (cart.length === 0) {
    list.innerHTML = '<li class="list-group-item text-center text-muted">Tu carrito está vacío.</li>';
    if (totalEl) totalEl.textContent = '0.00';
    return;
  }

  let html = '';
  let total = 0;

  cart.forEach((item, idx) => {
    const subtotal = item.price * item.quantity;
    total += subtotal;

    html += `
      <li class="list-group-item d-flex justify-content-between align-items-center">
        <div class="d-flex align-items-center gap-3">
          <img src="${item.img}" alt="${item.name}" style="width:60px;height:60px;object-fit:cover;border-radius:8px;">
          <div class="text-start">
            <strong>${item.name}</strong><br>
            <small class="text-muted">S/ ${item.price.toFixed(2)}</small>
          </div>
        </div>
        <div class="d-flex align-items-center gap-2">
          <input type="number" min="1" value="${item.quantity}" class="form-control form-control-sm quantity-input" data-index="${idx}" style="width:80px;">
          <div class="fw-semibold">S/ ${subtotal.toFixed(2)}</div>
          <button class="btn btn-sm btn-danger remove-btn" data-index="${idx}"><i class="fa fa-trash"></i></button>
        </div>
      </li>
    `;
  });

  list.innerHTML = html;
  if (totalEl) totalEl.textContent = total.toFixed(2);

  attachCartListeners();
}

function attachCartListeners() {
  document.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index);
      cart.splice(idx, 1);
      saveCart();
      renderCartItems();
      updateCartCount();
      window.dispatchEvent(new Event('cartUpdated'));
    });
  });

  document.querySelectorAll('.quantity-input').forEach(input => {
    input.addEventListener('change', () => {
      const idx = parseInt(input.dataset.index);
      let val = parseInt(input.value);
      if (isNaN(val) || val < 1) {
        input.value = cart[idx].quantity;
        return;
      }
      cart[idx].quantity = val;
      saveCart();
      renderCartItems();
      updateCartCount();
      window.dispatchEvent(new Event('cartUpdated'));
    });
  });
}

// ============================================
// PÁGINA DE CARRITO (cart.html)
// ============================================
async function renderCartPage() {
  const container = document.getElementById('cart-container');
  const totalEl = document.getElementById('total');
  
  console.log('📄 Renderizando página de carrito...');
  
  if (!container) {
    console.error('❌ No se encontró el contenedor del carrito');
    return;
  }

  loadCart();
  console.log('🛒 Items en carrito:', cart.length);
  
  if (cart.length === 0) {
    container.innerHTML = '<div class="text-center py-5"><h4 class="text-muted">El carrito está vacío</h4><a href="product.html" class="btn btn-rosado mt-3">Ver productos</a></div>';
    if (totalEl) totalEl.textContent = '0.00';
    return;
  }

  container.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-rosado" role="status"></div><p class="mt-3">Cargando productos...</p></div>';

  let html = `<div class="table-responsive"><table class="table align-middle">
  <thead class="table-light"><tr><th>Producto</th><th>Precio</th><th>Cantidad</th><th>Subtotal</th><th>Acción</th></tr></thead><tbody>`;
  
  let total = 0;
  let hasStockIssues = false;

  for (let i = 0; i < cart.length; i++) {
    const item = cart[i];
    console.log(`Verificando producto ${i + 1}:`, item);
    
    const product = await getProductById(item.id);
    
    if (!product) {
      console.warn(`⚠️ Producto ${item.name} no encontrado en BD`);
      html += `<tr class="table-danger">
        <td><div class="d-flex align-items-center gap-3"><img src="${item.img}" alt="${item.name}" style="width:80px;height:80px;object-fit:cover;border-radius:8px;"><div><strong>${item.name}</strong><br><small class="text-danger">❌ Producto no disponible</small></div></div></td>
        <td>S/ ${item.price.toFixed(2)}</td>
        <td>${item.quantity}</td>
        <td>-</td>
        <td><button class="btn btn-danger btn-sm remove-btn" data-index="${i}"><i class="fa fa-trash"></i></button></td>
      </tr>`;
      hasStockIssues = true;
      continue;
    }
    
    if (product.stock < item.quantity) {
      console.warn(`⚠️ Stock insuficiente para ${item.name}`);
      hasStockIssues = true;
      html += `<tr class="table-warning">
        <td><div class="d-flex align-items-center gap-3"><img src="${item.img}" alt="${item.name}" style="width:80px;height:80px;object-fit:cover;border-radius:8px;"><div><strong>${item.name}</strong><br><small class="text-danger">⚠️ Stock insuficiente (disponible: ${product.stock})</small></div></div></td>
        <td>S/ ${item.price.toFixed(2)}</td>
        <td><input type="number" min="1" max="${product.stock}" value="${item.quantity}" class="form-control form-control-sm quantity-input" data-index="${i}" style="width:90px;"></td>
        <td>S/ ${(item.price * item.quantity).toFixed(2)}</td>
        <td><button class="btn btn-danger btn-sm remove-btn" data-index="${i}"><i class="fa fa-trash"></i></button></td>
      </tr>`;
    } else {
      const subtotal = item.price * item.quantity;
      total += subtotal;
      html += `<tr>
        <td><div class="d-flex align-items-center gap-3"><img src="${item.img}" alt="${item.name}" style="width:80px;height:80px;object-fit:cover;border-radius:8px;"><div><strong>${item.name}</strong><br><small class="text-muted">S/ ${item.price.toFixed(2)} c/u</small></div></div></td>
        <td>S/ ${item.price.toFixed(2)}</td>
        <td><input type="number" min="1" max="${product.stock}" value="${item.quantity}" class="form-control form-control-sm quantity-input" data-index="${i}" style="width:90px;"></td>
        <td class="fw-bold">S/ ${subtotal.toFixed(2)}</td>
        <td><button class="btn btn-danger btn-sm remove-btn" data-index="${i}"><i class="fa fa-trash"></i></button></td>
      </tr>`;
    }
  }
  
  html += `</tbody></table></div>`;
  
  if (hasStockIssues) {
    html = '<div class="alert alert-warning mb-3"><strong>⚠️ Atención:</strong> Algunos productos tienen stock limitado o no están disponibles. Ajusta las cantidades antes de continuar.</div>' + html;
  }
  
  container.innerHTML = html;
  if (totalEl) totalEl.textContent = total.toFixed(2);
  
  console.log('✅ Carrito renderizado. Total:', total.toFixed(2));

  document.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index);
      cart.splice(idx, 1);
      saveCart();
      renderCartPage();
      window.dispatchEvent(new Event('cartUpdated'));
    });
  });

  document.querySelectorAll('.quantity-input').forEach(input => {
    input.addEventListener('change', () => {
      const idx = parseInt(input.dataset.index);
      let val = parseInt(input.value);
      const max = parseInt(input.max);
      
      if (isNaN(val) || val < 1) {
        input.value = 1;
        val = 1;
      }
      if (val > max) {
        input.value = max;
        val = max;
        showToast(`Solo hay ${max} unidades disponibles`, true);
      }
      
      cart[idx].quantity = val;
      saveCart();
      renderCartPage();
      window.dispatchEvent(new Event('cartUpdated'));
    });
  });
}

// ============================================
// CREAR PEDIDO Y ACTUALIZAR STOCK
// ============================================
async function createOrder(userId, cartItems, paymentMethod) {
  console.log('🛒 INICIANDO PROCESO DE COMPRA');
  console.log('Usuario ID:', userId);
  console.log('Método de pago:', paymentMethod);
  console.log('Items:', cartItems);
  
  try {
    console.log('\n📦 VERIFICANDO STOCK...');
    for (const item of cartItems) {
      const product = await getProductById(item.id);
      if (!product) {
        throw new Error(`Producto ${item.name} no encontrado`);
      }
      if (product.stock < item.quantity) {
        throw new Error(`Stock insuficiente para ${item.name}. Disponible: ${product.stock}`);
      }
      console.log(`✅ ${item.name}: OK (Stock: ${product.stock}, Solicitado: ${item.quantity})`);
    }

    const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    console.log(`\n💰 Total del pedido: S/ ${total.toFixed(2)}`);

    console.log('\n📝 CREANDO PEDIDO...');
    const { data: pedido, error: pedidoError } = await supabaseClient
      .from('pedidos')
      .insert({
        usuario_id: userId,
        total: total,
        metodo_pago: paymentMethod,
        estado: 'pendiente'
      })
      .select()
      .single();

    if (pedidoError) {
      console.error('Error al crear pedido:', pedidoError);
      throw pedidoError;
    }
    console.log(`✅ Pedido creado con ID: ${pedido.id}`);

    console.log('\n📋 GUARDANDO DETALLES...');
    const detalles = cartItems.map(item => ({
      pedido_id: pedido.id,
      producto_id: item.id,
      cantidad: item.quantity,
      precio_unitario: item.price,
      subtotal: item.price * item.quantity
    }));

    const { error: detallesError } = await supabaseClient
      .from('detalle_pedidos')
      .insert(detalles);

    if (detallesError) {
      console.error('Error al crear detalles:', detallesError);
      throw detallesError;
    }
    console.log('✅ Detalles guardados');

    console.log('\n🔄 ACTUALIZANDO STOCK...');
    for (const item of cartItems) {
      const product = await getProductById(item.id);
      const newStock = product.stock - item.quantity;
      
      console.log(`Actualizando ${item.name}: ${product.stock} → ${newStock}`);
      
      const { error: updateError } = await supabaseClient
        .from('productos')
        .update({ stock: newStock })
        .eq('id', item.id);

      if (updateError) {
        console.error(`Error al actualizar stock de ${item.name}:`, updateError);
        throw updateError;
      }
      
      console.log(`✅ ${item.name} actualizado`);
    }

    console.log('\n✅ COMPRA COMPLETADA EXITOSAMENTE');
    return pedido;

  } catch (error) {
    console.error('\n❌ ERROR EN EL PROCESO:', error);
    throw error;
  }
}

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Inicializando aplicación...');
  
  if (!supabaseClient) {
    console.error('❌ No se pudo inicializar Supabase');
    return;
  }
  
  loadCart();
  updateCartCount();

  const productList = document.getElementById('product-list');
  if (productList) {
    console.log('📦 Cargando página de productos...');
    await renderProducts();
  }

  const cartContainer = document.getElementById('cart-container');
  if (cartContainer) {
    console.log('🛒 Cargando página de carrito...');
    await renderCartPage();
  } else {
    renderCartItems();
  }

  const cartModalEl = document.getElementById('cartModal');
  if (cartModalEl) {
    cartModalEl.addEventListener('show.bs.modal', () => {
      loadCart();
      renderCartItems();
      updateCartCount();
    });
  }

  window.addEventListener('storage', (e) => {
    if (e.key === CART_KEY) {
      loadCart();
      updateCartCount();
      renderCartItems();
      
      if (document.getElementById('cart-container')) {
        renderCartPage();
      }
    }
  });

  window.addEventListener('cartUpdated', () => {
    loadCart();
    updateCartCount();
  });

  // ============================================
  // BOTÓN CHECKOUT - VERIFICAR AUTENTICACIÓN
  // ============================================
  const checkoutBtn = document.getElementById('checkout-btn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', async () => {
      loadCart();
      
      if (cart.length === 0) {
        alert('El carrito está vacío');
        return;
      }
      
      // VERIFICAR SI ESTÁ AUTENTICADO
      if (!window.auth || !window.auth.isAuthenticated || !window.auth.isAuthenticated()) {
        // MOSTRAR MODAL DE REGISTRO/LOGIN
        const loginRequired = confirm('⚠️ DEBES INICIAR SESIÓN O REGISTRARTE PARA CONTINUAR\n\n¿Deseas ir a la página de registro/login?');
        
        if (loginRequired) {
          // Guardar la URL actual para volver después del login
          sessionStorage.setItem('redirectAfterLogin', window.location.href);
          window.location.href = 'login.html';
        }
        return;
      }
      
      // Verificar stock
      let hasStockIssues = false;
      for (const item of cart) {
        const product = await getProductById(item.id);
        if (!product || product.stock < item.quantity) {
          hasStockIssues = true;
          break;
        }
      }
      
      if (hasStockIssues) {
        alert('⚠️ Algunos productos no tienen stock suficiente. Por favor ajusta las cantidades.');
        await renderCartPage();
        return;
      }
      
      // Mostrar modal de pago
      const paymentModal = new bootstrap.Modal(document.getElementById('paymentModal'));
      paymentModal.show();
    });
  }

  console.log('✅ Aplicación inicializada correctamente');
});

// ============================================
// FUNCIÓN PARA PROCESAR PAGO
// ============================================
window.performPay = async function(method) {
  console.log('💳 Iniciando pago con método:', method);
  
  loadCart();
  
  if (cart.length === 0) {
    alert('El carrito está vacío');
    return;
  }

  if (!window.auth || !window.auth.getSession) {
    alert('Error de autenticación. Por favor inicia sesión nuevamente.');
    window.location.href = 'login.html';
    return;
  }

  const session = window.auth.getSession();
  if (!session || !session.id) {
    alert('Debes iniciar sesión para completar la compra');
    window.location.href = 'login.html';
    return;
  }

  const paymentModal = document.getElementById('paymentModal');
  const modalBody = paymentModal.querySelector('.modal-body');
  const originalContent = modalBody.innerHTML;
  modalBody.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-rosado" role="status"></div><p class="mt-3">Procesando pago y actualizando stock...</p></div>';

  try {
    const order = await createOrder(session.id, cart, method);
    
    if (!order) {
      throw new Error('No se pudo crear el pedido');
    }

    bootstrap.Modal.getInstance(paymentModal).hide();

    localStorage.removeItem(CART_KEY);
    cart = [];
    updateCartCount();

    const confirmModal = new bootstrap.Modal(document.getElementById('confirmModal'));
    confirmModal.show();

    if (document.getElementById('product-list')) {
      await renderProducts();
    }

  } catch (error) {
    console.error('Error al procesar pago:', error);
    modalBody.innerHTML = originalContent;
    alert('Error al procesar el pago: ' + error.message);
  }
};

console.log('✅ Script productos-supabase.js cargado');