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
  const detailModal = document.getElementById('modal-detail');
  const closeDetail = document.getElementById('close-detail');
  const detailImage = document.getElementById('detail-image');
  const detailName = document.getElementById('detail-name');
  const detailCategory = document.getElementById('detail-category');
  const detailPrice = document.getElementById('detail-price');
  const detailDescription = document.getElementById('detail-description');
  const detailMore = document.getElementById('detail-more');
  const detailAddBtn = document.getElementById('detail-add-to-cart');

  // Modal toggles
  btnLogin.onclick = () => modalLogin.classList.remove('hidden');
  btnRegister.onclick = () => modalRegister.classList.remove('hidden');
  closes.forEach(b => b.onclick = () => {
    modalLogin.classList.add('hidden');
    modalRegister.classList.add('hidden');
    detailModal.classList.add('hidden');
    loginErr.textContent = '';
    regErr.textContent = '';
  });

  // Auth rendering
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
    else { modalLogin.classList.add('hidden'); await fetchUser(); loadAll(); }
  };

  // Register
  document.getElementById('reg-submit').onclick = async () => {
    const res = await apiJson('/api/register', {
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
    products = await apiJson('/api/products');
    populateCategories();
    applyFilters();
  }
  function populateCategories() {
    catFilter.innerHTML = '<option value="">All Categories</option>' +
      categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  }

  // Filters & sorting
  function applyFilters() {
    const term = searchInput.value.toLowerCase();
    const sort = sortSelect.value;
    const cat = catFilter.value;

    filtered = products
      .filter(p => (!cat || p.category_id == cat))
      .filter(p => p.name.toLowerCase().includes(term));

    if (sort === 'price-asc') filtered.sort((a,b) => a.price - b.price);
    else if (sort === 'price-desc') filtered.sort((a,b) => b.price - a.price);

    renderProducts();
  }

  // Render products compact view
  function renderProducts() {
    grid.innerHTML = filtered.map(p => `
      <div class="card" data-id="${p.id}">
        <img src="${p.image_url || 'https://via.placeholder.com/300x150'}" alt="${p.name}">
        <h3>${p.name}</h3>
        <p>$${p.price.toFixed(2)}</p>
        <button class="add-btn">Add to Cart</button>
      </div>
    `).join('');

    grid.querySelectorAll('.card').forEach(card => {
      const id = card.dataset.id;
      card.onclick = () => openDetail(id);
      const btn = card.querySelector('.add-btn');
      btn.onclick = e => { e.stopPropagation(); addToCart(id); };
    });
  }

  // Cart functions
  function addToCart(id) {
    const ex = cart.find(i => i.productId == id);
    const prod = products.find(p => p.id == id);
    if (!ex) cart.push({ productId: id, quantity: 1 });
    else if (ex.quantity < prod.stock) ex.quantity++;
    renderCart();
  }
  function renderCart() {
    cartItems.innerHTML = cart.map(i => {
      const p = products.find(x => x.id == i.productId);
      return `<li>${p.name} x${i.quantity} - $${(p.price*i.quantity).toFixed(2)} <button data-id="${i.productId}">×</button></li>`;
    }).join('');
    document.querySelectorAll('#cart-items button').forEach(b => b.onclick = () => {
      cart = cart.filter(i => i.productId != b.dataset.id);
      renderCart();
    });
    const total = cart.reduce((s, i) => s + products.find(p => p.id == i.productId).price * i.quantity, 0);
    cartTotal.textContent = total.toFixed(2);
    cartCount.textContent = cart.reduce((s, i) => s + i.quantity, 0);
  }
  btnCart.onclick = () => cartPanel.classList.remove('hidden');
  closeCartBtn.onclick = () => cartPanel.classList.add('hidden');
  checkoutBtn.onclick = async () => {
    if (!cart.length) return alert('Your cart is empty');
    const res = await apiJson('/api/checkout', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({cart})
    });
    if (res.success) { alert('Order placed! ID ' + res.orderId); cart = []; await loadAll(); cartPanel.classList.add('hidden'); }
    else alert(res.error);
  };

  // Product Detail Modal
  function openDetail(id) {
    const p = products.find(x => x.id == id);
    detailImage.src = p.image_url || 'https://via.placeholder.com/300x150';
    detailName.textContent = p.name;
    detailCategory.textContent = `Category: ${p.category}`;
    detailPrice.textContent = `Price: $${p.price.toFixed(2)}`;
    detailDescription.textContent = p.description;
    detailMore.innerHTML = '';
    ['socket','ram_type','memory_size','chipset','form_factor','capacity','wattage','efficiency','case_size','fan_size','cooler_type'].forEach(field => {
      if (p[field]) detailMore.innerHTML += `<p>${field.replace('_',' ')}: ${p[field]}</p>`;
    });
    detailAddBtn.onclick = () => { addToCart(id); closeDetailModal(); };
    detailModal.classList.remove('hidden');
  }
  function closeDetailModal() { detailModal.classList.add('hidden'); }
  closeDetail.onclick = closeDetailModal;

  // Event listeners
  searchInput.oninput = applyFilters;
  sortSelect.onchange = applyFilters;
  catFilter.onchange = applyFilters;

  // Initialize
  fetchUser().then(loadAll);
});
