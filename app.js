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
  const detailModal = document.getElementById('modal-detail');
  const closeDetail = document.getElementById('close-detail');
  const detailImage = document.getElementById('detail-image');
  const detailName = document.getElementById('detail-name');
  const detailCategory = document.getElementById('detail-category');
  const detailPrice = document.getElementById('detail-price');
  const detailDescription = document.getElementById('detail-description');
  const detailMore = document.getElementById('detail-more');
  const detailAddBtn = document.getElementById('detail-add-to-cart');

  // Event listeners for login/register omitted for brevity

  // Load data
  async function loadAll() {
    categories = await apiJson('/api/categories');
    products   = await apiJson('/api/products');
    populateCategories();
    applyFilters();
  }

  function populateCategories() {
    catFilter.innerHTML = '<option value="">All Categories</option>' +
      categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  }

  function applyFilters() {
    const term = searchInput.value.toLowerCase();
    const sort = sortSelect.value;
    const cat  = catFilter.value;

    filtered = products
      .filter(p => (!cat || p.category_id == cat))
      .filter(p => p.name.toLowerCase().includes(term));

    if (sort === 'price-asc')  filtered.sort((a,b) => a.price - b.price);
    if (sort === 'price-desc') filtered.sort((a,b) => b.price - a.price);

    renderProducts();
  }

  function renderProducts() {
    grid.innerHTML = '';
    const template = document.getElementById('product-card-template');
    filtered.forEach(p => {
      const clone = template.content.cloneNode(true);
      const card  = clone.querySelector('.card');
      card.dataset.id = p.id;
      clone.querySelector('img').src = p.image_url || 'https://via.placeholder.com/300x150';
      clone.querySelector('img').alt = p.name;
      clone.querySelector('h3').textContent = p.name;
      clone.querySelector('.price').textContent = `$${p.price.toFixed(2)}`;

      // Add to cart button
      const btn = clone.querySelector('.add-btn');
      btn.onclick = e => { e.stopPropagation(); addToCart(p.id); };

      // Card click for details
      card.onclick = () => openDetail(p.id);

      grid.appendChild(clone);
    });
  }

  // Cart & detail modal functions omitted for brevity

  // Initialization
  loadAll();
});
