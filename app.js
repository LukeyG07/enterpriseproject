// app.js
let user = null, categories = [], products = [], filtered = [], cart = [];
let currentPage = 1, itemsPerPage = 10;
const apiJson = (path, opts = {}) => fetch(path, { credentials: 'include', ...opts }).then(r => r.json());

document.addEventListener('DOMContentLoaded', () => {
  const btnLogin = document.getElementById('btn-login');
  const btnRegister = document.getElementById('btn-register');
  const btnAdmin = document.getElementById('btn-admin');
  const btnLogout = document.getElementById('btn-logout');
  const userInfo = document.getElementById('user-info');
  const btnCart = document.getElementById('btn-cart');
  const cartCount = document.getElementById('cart-count');
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
  const tableBody = document.querySelector('#products-table tbody');
  const pagination = document.getElementById('pagination');

  // Modal toggles
  btnLogin.onclick = () => modalLogin.classList.remove('hidden');
  btnRegister.onclick = () => modalRegister.classList.remove('hidden');
  closes.forEach(b => b.onclick = () => {
    modalLogin.classList.add('hidden');
    modalRegister.classList.add('hidden');
    loginErr.textContent = '';
    regErr.textContent = '';
  });

  // Render auth buttons
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

  // Auth actions
  document.getElementById('login-submit').onclick = async () => {
    const res = await apiJson('/api/login', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ username: loginUser.value, password: loginPass.value })
    });
    if (res.error) loginErr.textContent = res.error;
    else { modalLogin.classList.add('hidden'); await fetchUser(); loadAll(); }
  };

  document.getElementById('reg-submit').onclick = async () => {
    const res = await apiJson('/api/register', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ full_name:regName.value, shipping_address:regAddr.value, username:regUser.value, password:regPass.value })
    });
    if (res.error) regErr.textContent = res.error;
    else { modalRegister.classList.add('hidden'); await fetchUser(); loadAll(); }
  };

  btnLogout.onclick = async () => {
    await apiJson('/api/logout', {method:'POST'});
    user = null; renderAuth();
  };

  async function fetchUser() {
    const res = await apiJson('/api/me');
    user = res.user;
    renderAuth();
  }

  // Data load & filters
  async function loadAll() {
    categories = await apiJson('/api/categories');
    products   = await apiJson('/api/products');
    populateFilters(); applyFilters();
  }
  function populateFilters() {
    catFilter.innerHTML = '<option value="">All Categories</option>' + categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  }
  function applyFilters() {
    const term = searchInput.value.toLowerCase();
    const sort = sortSelect.value;
    const cat  = catFilter.value;
    filtered = products.filter(p => (!cat || p.category_id==cat) && p.name.toLowerCase().includes(term));
    if (sort==='price-asc') filtered.sort((a,b)=>a.price-b.price);
    if (sort==='price-desc')filtered.sort((a,b)=>b.price-a.price);
    currentPage=1; renderProducts();
  }

  // Render table & pagination
  function renderProducts(){
    tableBody.innerHTML='';
    const start=(currentPage-1)*itemsPerPage;
    const pageItems=filtered.slice(start,start+itemsPerPage);
    pageItems.forEach(p=>{
      const tr=document.createElement('tr');
      tr.innerHTML=`
        <td>${p.id}</td>
        <td><img src="${p.image_url||'https://via.placeholder.com/50'}" width="50"></td>
        <td>${p.name}</td>
        <td>${p.category}</td>
        <td>$${p.price.toFixed(2)}</td>
        <td>${p.stock}</td>
        <td>
          <button class="view-btn">View</button>
          <button class="add-btn">Add</button>
        </td>`;
      tr.querySelector('.view-btn').onclick=()=>openDetail(p.id);
      tr.querySelector('.add-btn').onclick=()=>addToCart(p.id);
      tableBody.appendChild(tr);
    }); renderPagination();
  }
  function renderPagination(){
    pagination.innerHTML='';
    const totalPages=Math.ceil(filtered.length/itemsPerPage);
    if(currentPage>1){const b=document.createElement('button');b.textContent='Prev';b.onclick=()=>{currentPage--;renderProducts();};pagination.appendChild(b);}    
    for(let i=1;i<=totalPages;i++){const b=document.createElement('button');b.textContent=i; if(i===currentPage) b.disabled=true; b.onclick=()=>{currentPage=i;renderProducts();}; pagination.appendChild(b);}    
    if(currentPage<totalPages){const b=document.createElement('button');b.textContent='Next';b.onclick=()=>{currentPage++;renderProducts();};pagination.appendChild(b);}  }

  // Stub cart/detail
  function addToCart(id){/*...*/}
  function openDetail(id){/*...*/}

  // Event bindings
  searchInput.oninput=applyFilters;
  sortSelect.onchange=applyFilters;
  catFilter.onchange=applyFilters;

  // Init
  fetchUser().then(loadAll);
});
