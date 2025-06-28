// app.js
let user = null, categories = [], products = [], filtered = [], cart = [];
const apiJson = (path, opts = {}) => fetch(path, { credentials: 'include', ...opts }).then(r => r.json());

document.addEventListener('DOMContentLoaded', () => {
  // DOM refs
  const btnLogin = document.getElementById('btn-login');
  const btnRegister = document.getElementById('btn-register');
  const btnAdmin = document.getElementById('btn-admin');
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
  const closes = document.querySelectorAll('.modal-close');
  const searchInput = document.getElementById('search-input');
  const sortSelect = document.getElementById('sort-select');
  const catFilter = document.getElementById('category-filter');
  const grid = document.getElementById('products-grid');
  const cartPanel = document.getElementById('cart-panel');
  const cartItems = document.getElementById('cart-items');
  const cartCount = document.getElementById('cart-count');
  const cartTotal = document.getElementById('cart-total');
  const checkoutBtn = document.getElementById('checkout-btn');
  const closeCartBtn = document.getElementById('close-cart');

  // Modal toggles
  btnLogin.onclick = () => modalLogin.classList.remove('hidden');
  btnRegister.onclick = () => modalRegister.classList.remove('hidden');
  closes.forEach(b => b.onclick = () => {
    modalLogin.classList.add('hidden');
    modalRegister.classList.add('hidden');
    loginErr.textContent = '';
    regErr.textContent = '';
  });

  // Render auth controls
  function renderAuth() {
    if (user) {
      btnLogin.classList.add('hidden');
      btnRegister.classList.add('hidden');
      btnLogout.classList.remove('hidden');
      btnCart.classList.remove('hidden');
      btnAdmin.classList.toggle('hidden', !user.is_admin);
      userInfo.textContent = user.username;
    } else {
      btnLogin.classList.remove('hidden');
      btnRegister.classList.remove('hidden');
      btnLogout.classList.add('hidden');
      btnCart.classList.add('hidden');
      btnAdmin.classList.add('hidden');
      userInfo.textContent = '';
    }
  }

  // Fetch current user
  async function fetchUser() {
    const res = await apiJson('/api/me');
    user = res.user;
    renderAuth();
  }

  // Login
  document.getElementById('login-submit').onclick = async () => {
    const res = await apiJson('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: loginUser.value, password: loginPass.value })
    });
    if (res.error) loginErr.textContent = res.error;
    else {
      modalLogin.classList.add('hidden');
      await fetchUser();
      loadAll();
    }
  };

  // Register
  document.getElementById('reg-submit').onclick = async () => {
    const res = await apiJson('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: regName.value, shipping_address: regAddr.value, username: regUser.value, password: regPass.value })
    });
    if (res.error) regErr.textContent = res.error;
    else {
      modalRegister.classList.add('hidden');
      await fetchUser();
      loadAll();
    }
  };

  // Logout
  btnLogout.onclick = async () => {
    await apiJson('/api/logout', { method: 'POST' });
    user = null;
    renderAuth();
  };

  // Load categories & products
  async function loadAll() {
    categories = await apiJson('/api/categories');
    products   = await apiJson('/api/products');
    populateCategories();
    applyFilters();
  }
  function populateCategories() {
    catFilter.innerHTML = '<option value="">All Categories</option>' + categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  }

  // Filters & sorting
  function applyFilters() {
    const term = searchInput.value.toLowerCase();
    const sort = sortSelect.value;
    const cat  = catFilter.value;

    filtered = products.filter(p => (!cat || p.category_id == cat) && p.name.toLowerCase().includes(term));
    if (sort === 'price-asc')  filtered.sort((a,b) => a.price - b.price);
    if (sort === 'price-desc') filtered.sort((a,b) => b.price - a.price);
    renderProducts();
  }

  // Render products
  function renderProducts() {
    grid.innerHTML = '';
    const tpl = document.getElementById('product-card-template');
    filtered.forEach(p => {
      const clone = tpl.content.cloneNode(true);
      const card  = clone.querySelector('.card');
      card.dataset.id = p.id;
      clone.querySelector('img').src = p.image_url || 'https://via.placeholder.com/300x150';
      clone.querySelector('img').alt = p.name;
      clone.querySelector('h3').textContent = p.name;
      clone.querySelector('.price').textContent = `$${p.price.toFixed(2)}`;
      clone.querySelector('.add-btn').onclick = e => { e.stopPropagation(); addToCart(p.id); };
      card.onclick = () => openDetail(p.id);
      grid.appendChild(clone);
    });
  }

  // Cart functions (omitted)
  function addToCart(id) { /* ... */ }
  function openDetail(id) { /* ... */ }

  // Event bindings
  searchInput.oninput = applyFilters;
  sortSelect.onchange = applyFilters;
  catFilter.onchange = applyFilters;

  // Init
  fetchUser().then(loadAll);
});
