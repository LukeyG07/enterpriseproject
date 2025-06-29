// public/app.js
// Ensure you’re fetching the updated /api/products and actually rendering them

let user = null,
    categories = [],
    products = [],
    filtered = [],
    currentPage = 1,
    itemsPerPage = 10;

const apiJson = (path, opts = {}) =>
  fetch(path, { credentials: 'include', ...opts })
    .then(r => r.json())
    .catch(err => console.error('API error', err));

document.addEventListener('DOMContentLoaded', () => {
  // DOM refs
  const btnLogin = document.getElementById('btn-login');
  const btnRegister = document.getElementById('btn-register');
  const btnAdmin = document.getElementById('btn-admin');
  const btnLogout = document.getElementById('btn-logout');
  const userInfo = document.getElementById('user-info');
  const btnCart = document.getElementById('btn-cart');
  const cartCount = document.getElementById('cart-count');
  const searchInput = document.getElementById('search-input');
  const sortSelect = document.getElementById('sort-select');
  const catFilter = document.getElementById('category-filter');
  const tableBody = document.querySelector('#products-table tbody');
  const pagination = document.getElementById('pagination');

  // Auth/rendering logic (unchanged) …
  function renderAuth() { /* … */ }
  async function fetchUser() { /* … */ }

  // Load categories + products
  async function loadAll() {
    categories = await apiJson('/api/categories');
    products   = await apiJson('/api/products');
    populateFilters();
    applyFilters();
  }

  function populateFilters() {
    catFilter.innerHTML = '<option value=\"\">All Categories</option>'
      + categories.map(c => `<option value=\"${c.id}\">${c.name}</option>`).join('');
  }

  function applyFilters() {
    const term = searchInput.value.toLowerCase();
    const sort = sortSelect.value;
    const cat  = catFilter.value;
    filtered = products.filter(p =>
      (!cat || p.category_id == cat)
      && p.name.toLowerCase().includes(term)
    );
    if (sort === 'price-asc')  filtered.sort((a,b) => a.price - b.price);
    if (sort === 'price-desc') filtered.sort((a,b) => b.price - a.price);
    currentPage = 1;
    renderProducts();
  }

  function renderProducts() {
    tableBody.innerHTML = '';
    if (filtered.length === 0) {
      tableBody.innerHTML = '<tr><td colspan=\"7\">No products found.</td></tr>';
      return;
    }
    const start = (currentPage - 1) * itemsPerPage;
    filtered.slice(start, start + itemsPerPage).forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${p.id}</td>
        <td><img src=\"${p.image_url||'https://via.placeholder.com/50'}\" width=\"50\"></td>
        <td>${p.name}</td>
        <td>${p.category}</td>
        <td>$${p.price.toFixed(2)}</td>
        <td>${p.stock}</td>
        <td>
          <button class=\"view-btn\">View</button>
          <button class=\"add-btn\">Add</button>
        </td>`;
      tableBody.appendChild(tr);
      tr.querySelector('.view-btn').onclick = () => openDetail(p.id);
      tr.querySelector('.add-btn').onclick = () => addToCart(p.id);
    });
    renderPagination();
  }

  function renderPagination() {
    pagination.innerHTML = '';
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    if (currentPage > 1) {
      const b = document.createElement('button');
      b.textContent = 'Prev';
      b.onclick = () => { currentPage--; renderProducts(); };
      pagination.appendChild(b);
    }
    for (let i = 1; i <= totalPages; i++) {
      const b = document.createElement('button');
      b.textContent = i;
      if (i === currentPage) b.disabled = true;
      b.onclick = () => { currentPage = i; renderProducts(); };
      pagination.appendChild(b);
    }
    if (currentPage < totalPages) {
      const b = document.createElement('button');
      b.textContent = 'Next';
      b.onclick = () => { currentPage++; renderProducts(); };
      pagination.appendChild(b);
    }
  }

  // stubs for detail & cart
  function openDetail(id) { /* … */ }
  function addToCart(id)  { /* … */ }

  // bind filters
  searchInput.oninput = applyFilters;
  sortSelect.onchange = applyFilters;
  catFilter.onchange   = applyFilters;

  // init
  fetchUser().then(loadAll);
});
