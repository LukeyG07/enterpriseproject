// app.js: Browse, auth, cart functionality
let user = null, categories = [], products = [], cart = [];
const api = (path, opts = {}) => fetch(path, { credentials: 'include', ...opts }).then(r => r.json());

document.addEventListener('DOMContentLoaded', () => {
  // DOM refs
  const btnLogin = document.getElementById('btn-login');
  const btnRegister = document.getElementById('btn-register');
  const btnLogout = document.getElementById('btn-logout');
  const btnCart = document.getElementById('btn-cart');
  const userInfo = document.getElementById('user-info');
  const modalLogin = document.getElementById('modal-login');
  const modalRegister = document.getElementById('modal-register');
  const loginUser = document.getElementById('login-username');
  const loginPass = document.getElementById('login-password');
  const regName = document.getElementById('reg-fullname');
  const regUser = document.getElementById('reg-username');
  const regAddr = document.getElementById('reg-address');
  const regPass = document.getElementById('reg-password');
  const loginErr = document.getElementById('login-error');
  const regErr = document.getElementById('reg-error');
  const modalCloses = document.querySelectorAll('.modal-close');
  const categoryFilter = document.getElementById('category-filter');
  const productsGrid = document.getElementById('products-grid');
  const cartPanel = document.getElementById('cart-panel');
  const cartItems = document.getElementById('cart-items');
  const cartCount = document.getElementById('cart-count');
  const cartTotal = document.getElementById('cart-total');
  const checkoutBtn = document.getElementById('checkout-btn');
  const closeCartBtn = document.getElementById('close-cart');

  // Show/hide modals
  btnLogin.addEventListener('click', () => modalLogin.classList.remove('hidden'));
  btnRegister.addEventListener('click', () => modalRegister.classList.remove('hidden'));
  modalCloses.forEach(b => b.addEventListener('click', () => {
    modalLogin.classList.add('hidden');
    modalRegister.classList.add('hidden');
    loginErr.textContent = '';
    regErr.textContent = '';
  }));

  // Auth rendering
  function renderAuth() {
    if (user) {
      btnLogin.classList.add('hidden');
      btnRegister.classList.add('hidden');
      btnLogout.classList.remove('hidden');
      btnCart.classList.remove('hidden');
      userInfo.textContent = user.username;
    } else {
      btnLogin.classList.remove('hidden');
      btnRegister.classList.remove('hidden');
      btnLogout.classList.add('hidden');
      btnCart.classList.add('hidden');
      userInfo.textContent = '';
    }
  }

  // Fetch current user
  async function fetchUser() {
    const { user: u } = await api('/api/me');
    user = u;
    renderAuth();
  }

  // Login
  document.getElementById('login-submit').addEventListener('click', async () => {
    const res = await api('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: loginUser.value, password: loginPass.value })
    });
    if (res.error) loginErr.textContent = res.error;
    else { modalLogin.classList.add('hidden'); await fetchUser(); loadAll(); }
  });

  // Register
  document.getElementById('reg-submit').addEventListener('click', async () => {
    const res = await api('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: regName.value,
        shipping_address: regAddr.value,
        username: regUser.value,
        password: regPass.value
      })
    });
    if (res.error) regErr.textContent = res.error;
    else { modalRegister.classList.add('hidden'); await fetchUser(); loadAll(); }
  });

  // Logout
  btnLogout.addEventListener('click', async () => {
    await api('/api/logout', { method: 'POST' });
    user = null;
    renderAuth();
  });

  // Load categories & products
  async function loadAll() {
    categories = await api('/api/categories');
    products = await api('/api/products');
    renderCategories();
    renderProducts();
    renderCart();
  }

  // Render categories dropdown
  function renderCategories() {
    categoryFilter.innerHTML = '<option value="">All Categories</option>' +
      categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    categoryFilter.onchange = renderProducts;
  }

  // Render product cards
  function renderProducts() {
    const cid = categoryFilter.value;
    const list = cid ? products.filter(p => p.category_id == cid) : products;
    productsGrid.innerHTML = list.map(p => `
      <div class="card">
        <img src="${p.image_url || 'https://via.placeholder.com/300x150'}" alt="${p.name}">
        <h3>${p.name}</h3>
        <p>${p.category}</p>
        <p>$${p.price.toFixed(2)}</p>
        <p>Stock: ${p.stock}</p>
        <button ${p.stock ? '' : 'disabled'} data-id="${p.id}">Add to Cart</button>
      </div>
    `).join('');
    document.querySelectorAll('.card button').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        addToCart(id);
      };
    });
  }

  // Cart functions
  function addToCart(id) {
    const existing = cart.find(i => i.productId == id);
    const prod = products.find(p => p.id == id);
    if (!existing) cart.push({ productId: id, quantity: 1 });
    else if (existing.quantity < prod.stock) existing.quantity++;
    renderCart();
  }

  function renderCart() {
    cartItems.innerHTML = cart.map(i => {
      const p = products.find(x => x.id == i.productId);
      return `<li>${p.name} x${i.quantity} - $${(p.price * i.quantity).toFixed(2)}  
        <button data-id="${i.productId}">×</button></li>`;
    }).join('');
    document.querySelectorAll('#cart-items button').forEach(b => {
      b.onclick = () => {
        const pid = b.dataset.id;
        cart = cart.filter(i => i.productId != pid);
        renderCart();
      };
    });
    const total = cart.reduce((sum, i) => sum + products.find(p => p.id == i.productId).price * i.quantity, 0);
    cartTotal.textContent = total.toFixed(2);
    cartCount.textContent = cart.reduce((sum, i) => sum + i.quantity, 0);
  }

  btnCart.onclick = () => cartPanel.classList.remove('hidden');
  closeCartBtn.onclick = () => cartPanel.classList.add('hidden');

  checkoutBtn.onclick = async () => {
    if (!cart.length) return alert('Your cart is empty');
    const res = await api('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cart })
    });
    if (res.success) {
      alert('Order placed! ID ' + res.orderId);
      cart = [];
      await loadAll();
      cartPanel.classList.add('hidden');
    } else {
      alert(res.error || 'Checkout failed');
    }
  };

  // Initialize
  fetchUser().then(loadAll);
});
