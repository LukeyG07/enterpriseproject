// app.js
let user = null, categories = [], products = [], filtered = [], cart = [];
let currentPage = 1, itemsPerPage = 10;
const apiJson = (path, opts = {}) => fetch(path, { credentials: 'include', ...opts }).then(r => r.json());

document.addEventListener('DOMContentLoaded', () => {
  // DOM refs
  const btnLogin = document.getElementById('btn-login');
  const btnRegister = document.getElementById('btn-register');
  const btnAdmin = document.getElementById('btn-admin');
  const btnLogout = document.getElementById('btn-logout');
  const btnCart = document.getElementById('btn-cart');
  const userInfo = document.getElementById('user-info');
  const searchInput = document.getElementById('search-input');
  const sortSelect = document.getElementById('sort-select');
  const catFilter = document.getElementById('category-filter');
  const tableBody = document.querySelector('#products-table tbody');
  const pagination = document.getElementById('pagination');

  // Auth handlers (login/register) omitted for brevity...

  // Fetch and render data
  async function loadAll() {
    categories = await apiJson('/api/categories');
    products   = await apiJson('/api/products');
    populateFilters(); applyFilters();
  }
  function populateFilters() {
    catFilter.innerHTML = '<option value="">All Categories</option>' +
      categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  }
  function applyFilters() {
    const term = searchInput.value.toLowerCase();
    const sort = sortSelect.value;
    const cat  = catFilter.value;
    filtered = products
      .filter(p => (!cat || p.category_id == cat) && p.name.toLowerCase().includes(term));
    if (sort === 'price-asc') filtered.sort((a,b) => a.price - b.price);
    if (sort === 'price-desc') filtered.sort((a,b) => b.price - a.price);
    currentPage = 1;
    renderProducts();
  }

  function renderProducts() {
    tableBody.innerHTML = '';
    const start = (currentPage - 1) * itemsPerPage;
    const pageItems = filtered.slice(start, start + itemsPerPage);

    pageItems.forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${p.id}</td>
        <td><img src="${p.image_url||'https://via.placeholder.com/50'}" width="50"></td>
        <td>${p.name}</td>
        <td>${p.category}</td>
        <td>$${p.price.toFixed(2)}</td>
        <td>${p.stock}</td>
        <td>
          <button class="view-btn">View</button>
          <button class="add-btn">Add to Cart</button>
        </td>
      `;
      tableBody.appendChild(tr);
      tr.querySelector('.view-btn').onclick = () => openDetail(p.id);
      tr.querySelector('.add-btn').onclick = () => addToCart(p.id);
    });
    renderPagination();
  }

  function renderPagination() {
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    pagination.innerHTML = '';
    if (currentPage > 1) {
      const prev = document.createElement('button');
      prev.textContent = 'Prev'; prev.onclick = () => { currentPage--; renderProducts(); };
      pagination.appendChild(prev);
    }
    for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement('button');
      btn.textContent = i;
      if (i === currentPage) btn.disabled = true;
      btn.onclick = () => { currentPage = i; renderProducts(); };
      pagination.appendChild(btn);
    }
    if (currentPage < totalPages) {
      const nxt = document.createElement('button');
      nxt.textContent = 'Next'; nxt.onclick = () => { currentPage++; renderProducts(); };
      pagination.appendChild(nxt);
    }
  }

  // Cart & detail functions
  function addToCart(id) { /* ... */ }
  function openDetail(id)  { /* ... */ }

  // Event listeners
  searchInput.oninput = applyFilters;
  sortSelect.onchange = applyFilters;
  catFilter.onchange = applyFilters;

  // Initialize
  fetchUser().then(loadAll);
});
