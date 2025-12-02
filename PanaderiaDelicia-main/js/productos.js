/* productos.js
   Lógica compartida para product.html y cart.html
   - usa localStorage key "cart"
   - objetos: { name, price, img, quantity }
*/

const CART_KEY = 'cart';
let cart = JSON.parse(localStorage.getItem(CART_KEY)) || [];

// guarda carrito
function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

// actualiza contador del navbar
function updateCartCount() {
  const countEl = document.getElementById('cart-count');
  const count = cart.reduce((acc, i) => acc + (i.quantity || 0), 0);
  if (countEl) {
    countEl.textContent = count;
    // si es badge pequeño, se puede ocultar si es 0
    if (count === 0) {
      // opcional: mostrar 0 o vaciar
      // countEl.style.display = 'none';
    } else {
      // countEl.style.display = '';
    }
  }
}

// muestra toast (si existe)
function showToast(message) {
  const toastBody = document.getElementById('toast-body');
  const toastEl = document.getElementById('liveToast');
  if (!toastBody || !toastEl) return;
  toastBody.textContent = message;
  const toast = new bootstrap.Toast(toastEl);
  toast.show();
}

// renderiza items en el elemento #cart-items (usado en modal y en cart.html)
function renderCartItems() {
  const list = document.getElementById('cart-items');
  const totalEl = document.getElementById('cart-total') || document.getElementById('total');

  if (!list) return; // si no hay lista en la página actual, no hacer nada

  if (cart.length === 0) {
    list.innerHTML = '<li class="list-group-item text-center text-muted">Tu carrito está vacío.</li>';
    if (totalEl) totalEl.textContent = '0.00';
    return;
  }

  let html = '';
  let total = 0;

  cart.forEach((item, idx) => {
    const subtotal = (item.price * item.quantity);
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

  // listeners para inputs y botones creados dinámicamente
  document.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index, 10);
      if (!isNaN(idx)) {
        cart.splice(idx, 1);
        saveCart();
        renderCartItems();
        updateCartCount();
        // notificar a otras páginas
        window.dispatchEvent(new Event('cartUpdated'));
      }
    });
  });

  document.querySelectorAll('.quantity-input').forEach(input => {
    input.addEventListener('change', () => {
      const idx = parseInt(input.dataset.index, 10);
      let val = parseInt(input.value, 10);
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

// añadir producto al carrito
function addToCart(product, qty = 1) {
  qty = parseInt(qty, 10) || 1;
  // buscar por nombre (puedes ajustar si usas ID)
  const existing = cart.find(i => i.name === product.name);
  if (existing) {
    existing.quantity += qty;
  } else {
    cart.push({
      name: product.name,
      price: parseFloat(product.price),
      img: product.img || '',
      quantity: qty
    });
  }
  saveCart();
  updateCartCount();
  renderCartItems();
  showToast(`${product.name} agregado al carrito (${qty})`);
  // notificar a otras páginas
  window.dispatchEvent(new Event('cartUpdated'));
}

// al cargar DOM attach events (para product.html)
document.addEventListener('DOMContentLoaded', () => {
  // sincronizar cart desde localStorage
  cart = JSON.parse(localStorage.getItem(CART_KEY)) || [];
  updateCartCount();
  renderCartItems();

  // listeners para botones "Ver más" (detail)
  document.querySelectorAll('.view-detail').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalEl = document.getElementById('productModal');
      if (!modalEl) return;
      const modal = new bootstrap.Modal(modalEl);
      const name = btn.dataset.name;
      const price = parseFloat(btn.dataset.price);
      const img = btn.dataset.img;
      const desc = btn.dataset.desc || '';
      document.getElementById('modalTitle').textContent = name;
      document.getElementById('modalPrice').textContent = price.toFixed(2);
      document.getElementById('modalImg').src = img;
      document.getElementById('modalDesc').textContent = desc;
      document.getElementById('modalQty').value = 1;
      modal.show();

      // setear evento agregar: remover handler previo por seguridad
      const addBtn = document.getElementById('addToCartBtn');
      const existingHandler = addBtn._handler;
      if (existingHandler) addBtn.removeEventListener('click', existingHandler);

      const handler = () => {
        const qty = parseInt(document.getElementById('modalQty').value, 10) || 1;
        addToCart({ name, price, img }, qty);
        modal.hide();
      };
      addBtn.addEventListener('click', handler);
      addBtn._handler = handler;
    });
  });

  // cuando se abre el modal carrito, renderizar (para product.html)
  const cartModalEl = document.getElementById('cartModal');
  if (cartModalEl) {
    cartModalEl.addEventListener('show.bs.modal', () => {
      cart = JSON.parse(localStorage.getItem(CART_KEY)) || [];
      renderCartItems();
      updateCartCount();
    });
  }

  // escuchar eventos de actualización de carrito (para sincronizar en otras pestañas)
  window.addEventListener('storage', (e) => {
    if (e.key === CART_KEY) {
      cart = JSON.parse(localStorage.getItem(CART_KEY)) || [];
      updateCartCount();
      renderCartItems();
    }
  });

  // también emitir evento global cuando cart cambia (otras páginas pueden escucharlo)
  window.addEventListener('cartUpdated', () => {
    // actualizamos visuales si existe
    cart = JSON.parse(localStorage.getItem(CART_KEY)) || [];
    updateCartCount();
  });

  // En cart.html: preparar checkout -> login -> payment
  // Si existen elementos de login o botones de pago, conectar aquí para que el mismo archivo controle todo.
  const checkoutBtn = document.getElementById('checkout-btn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      if (!cart || cart.length === 0) {
        alert('El carrito está vacío');
        return;
      }
      const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
      loginModal.show();
    });
  }

  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail')?.value?.trim();
      const password = document.getElementById('loginPassword')?.value?.trim();
      if (!email || !password) {
        alert('Por favor completa ambos campos');
        return;
      }
      // simple "login" de demostración
      localStorage.setItem('user', JSON.stringify({ email }));
      const loginModalEl = document.getElementById('loginModal');
      const loginInstance = bootstrap.Modal.getInstance(loginModalEl);
      if (loginInstance) loginInstance.hide();
      // abrir modal de pago
      const paymentModal = new bootstrap.Modal(document.getElementById('paymentModal'));
      paymentModal.show();
    });
  }

  // function to perform pay (exposed globally)
  window.performPay = function(method) {
    // método de pago recibido
    if (!cart || cart.length === 0) {
      alert('El carrito está vacío');
      return;
    }
    // cerrar payment modal
    const pm = document.getElementById('paymentModal');
    const pmInstance = bootstrap.Modal.getInstance(pm);
    if (pmInstance) pmInstance.hide();

    // limpiar carrito
    cart = [];
    saveCart();
    renderCartItems();
    updateCartCount();
    // notificar
    window.dispatchEvent(new Event('cartUpdated'));

    // mostrar confirmación
    const confirmModal = new bootstrap.Modal(document.getElementById('confirmModal'));
    confirmModal.show();
  };

});
