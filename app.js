// app.js: Frontend with auth, browsing, cart, and admin panels
let user = null;
let categories = [];
let products = [];
let cart = [];

// DOM Elements
const loginPanel = document.getElementById('login-panel');
const loginBtn = document.getElementById('login-btn');
const loginError = document.getElementById('login-error');
const usernameInput = document.getElementById('login-username');
const passwordInput = document.getElementById('login-password');
const logoutBtn = document.getElementById('logout-btn');
const userInfo = document.getElementById('user-info');
const appMain = document.getElementById('app');
const categoryFilter = document.getElementById('category-filter');
const productList = document.getElementById('product-list');
const openCartBtn = document.getElementById('open-cart');
const cartPanel = document.getElementById('cart');
const cartItemsEl = document.getElementById('cart-items');
const cartCountEl = document.getElementById('cart-count');
const cartTotalEl = document.getElementById('cart-total');
const checkoutBtn = document.getElementById('checkout-btn');
const closeCartBtn = document.getElementById('close-cart');
const adminNav = document.getElementById('admin-nav');
const adminProductsBtn = document.getElementById('admin-products-btn');
const adminOrdersBtn = document.getElementById('admin-orders-btn');
const adminProductsPanel = document.getElementById('admin-products-panel');
const adminOrdersPanel = document.getElementById('admin-orders-panel');
const productAdminList = document.getElementById('product-admin-list');
const ordersList = document.getElementById('orders-list');
const newProductBtn = document.getElementById('new-product-btn');

// Utility: API calls
async function api(path, opts={}) {
  const res = await fetch(path, { headers: {'Content-Type':'application/json'}, credentials: 'include', ...opts});
  return res.json();
}

// Auth
async function fetchMe() {
  const { user: u } = await api('/api/me');
  user = u;
  renderAuth();
}
function renderAuth() {
  if (!user) {
    loginPanel.classList.remove('hidden');
    appMain.classList.add('hidden');
    logoutBtn.classList.add('hidden');
    openCartBtn.classList.add('hidden');
    adminNav.classList.add('hidden');
  } else {
    loginPanel.classList.add('hidden');
    appMain.classList.remove('hidden');
    logoutBtn.classList.remove('hidden');
    openCartBtn.classList.remove('hidden');
    userInfo.textContent = user.username;
    if (user.is_admin) adminNav.classList.remove('hidden');
  }
}
loginBtn.addEventListener('click', async () => {
  loginError.textContent = '';
  const u = usernameInput.value.trim();
  const p = passwordInput.value;
  const res = await api('/api/login', { method:'POST', body: JSON.stringify({username:u,password:p}) });
  if (res.error) loginError.textContent = res.error;
  else fetchMe();
});
logoutBtn.addEventListener('click', async () => { await api('/api/logout',{method:'POST'}); user=null; renderAuth(); });

// Load data
async function loadData() {
  categories = await api('/api/categories');
  products = await api('/api/products');
  renderCategories();
  renderProducts();
  renderCart();
}

// Categories filter
function renderCategories() {
  categoryFilter.innerHTML = '<option value="">All Categories</option>' + categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  categoryFilter.onchange = renderProducts;
}
// Products browsing
function renderProducts() {
  const cid = categoryFilter.value;
  const filtered = cid ? products.filter(p=>p.category_id==cid) : products;
  productList.innerHTML = filtered.map(p => `
    <div class="product-card">
      <h3>${p.name}</h3>
      <div>${p.category}</div>
      <div>$${p.price.toFixed(2)}</div>
      <div>Stock: ${p.stock}</div>
      <button ${p.stock===0?'disabled':''} data-id="${p.id}">Add to Cart</button>
    </div>
  `).join('');
  document.querySelectorAll('.product-card button').forEach(btn=>btn.onclick=()=>addToCart(btn.dataset.id));
}

// Cart functions
function addToCart(id) {
  const existing = cart.find(i=>i.productId==id);
  const prod = products.find(p=>p.id==id);
  if (!existing) cart.push({productId:id,quantity:1});
  else if (existing.quantity < prod.stock) existing.quantity++;
  renderCart();
}
function renderCart() {
  cartItemsEl.innerHTML = cart.map(i=>{
    const p = products.find(x=>x.id==i.productId);
    return `<li>${p.name} x${i.quantity} - $${(p.price*i.quantity).toFixed(2)} <button data-id="${i.productId}">Remove</button></li>`;
  }).join('');
  document.querySelectorAll('#cart-items button').forEach(b=>b.onclick=()=>{cart=cart.filter(i=>i.productId!=b.dataset.id);renderCart();});
  const total = cart.reduce((sum,i)=>sum + products.find(p=>p.id==i.productId).price*i.quantity,0);
  cartCountEl.textContent = cart.reduce((sum,i)=>sum+i.quantity,0);
  cartTotalEl.textContent = total.toFixed(2);
}
openCartBtn.onclick = () => cartPanel.classList.remove('hidden');
closeCartBtn.onclick = () => cartPanel.classList.add('hidden');
checkoutBtn.onclick = async () => {
  if (!cart.length) return alert('Cart is empty');
  const res = await api('/api/checkout',{method:'POST',body:JSON.stringify({cart})});
  if (res.success) { alert('Order '+res.orderId+' placed'); cart=[]; loadData(); cartPanel.classList.add('hidden'); }
  else alert(res.error);
};

// Admin panels
adminProductsBtn.onclick = () => { adminProductsPanel.classList.remove('hidden'); adminOrdersPanel.classList.add('hidden'); loadAdminProducts(); };
adminOrdersBtn.onclick = () => { adminOrdersPanel.classList.remove('hidden'); adminProductsPanel.classList.add('hidden'); loadAdminOrders(); };
async function loadAdminProducts() {
  const list = await api('/api/admin/products');
  productAdminList.innerHTML = list.map(p=>`
    <div class="admin-item">
      <strong>${p.name}</strong> (${p.category})<br>
      $${p.price.toFixed(2)} | Stock: ${p.stock}<br>
      <button data-id="${p.id}" class="edit">Edit</button>
      <button data-id="${p.id}" class="del">Delete</button>
    </div>
  `).join('');
  list.forEach(p=>{
    productAdminList.querySelector(`button.edit[data-id="${p.id}"]`).onclick=()=>editProduct(p);
    productAdminList.querySelector(`button.del[data-id="${p.id}"]`).onclick=async()=>{ await api(`/api/admin/products/${p.id}`,{method:'DELETE'});loadAdminProducts(); };
  });
}
async function loadAdminOrders() {
  const list = await api('/api/admin/orders');
  ordersList.innerHTML = list.map(o=>`<li>Order #${o.id} by ${o.username||'Guest'}: $${o.total.toFixed(2)} on ${new Date(o.created_at).toLocaleString()}</li>`).join('');
}
newProductBtn.onclick = () => editProduct();
function editProduct(p={}) {
  const isNew = !p.id;
  const form = document.createElement('div');
  form.className='admin-item';
  form.innerHTML = `
    <input placeholder="Name" value="${p.name||''}" id="f-name" /><br>
    <select id="f-cat">${categories.map(c=>`<option value="${c.id}"${p.category_id==c.id?' selected':''}>${c.name}</option>`).join('')}</select><br>
    <input placeholder="Socket" value="${p.socket||''}" id="f-socket" /><br>
    <input placeholder="RAM Type" value="${p.ram_type||''}" id="f-ram" /><br>
    <input placeholder="Price" type="number" value="${p.price||0}" id="f-price" /><br>
    <input placeholder="Stock" type="number" value="${p.stock||0}" id="f-stock" /><br>
    <textarea placeholder="Description" id="f-desc">${p.description||''}</textarea><br>
    <button id="save-btn">Save</button>
    <button id="cancel-btn">Cancel</button>
  `;
  productAdminList.prepend(form);
  form.querySelector('#cancel-btn').onclick = () => loadAdminProducts();
  form.querySelector('#save-btn').onclick = async () => {
    const data = {
      name: form.querySelector('#f-name').value,
      category_id: form.querySelector('#f-cat').value,
      socket: form.querySelector('#f-socket').value,
      ram_type: form.querySelector('#f-ram').value,
      price: form.querySelector('#f-price').value,
      description: form.querySelector('#f-desc').value,
      stock: form.querySelector('#f-stock').value
    };
    if (isNew) await api('/api/admin/products',{method:'POST',body:JSON.stringify(data)});
    else await api(`/api/admin/products/${p.id}`,{method:'PUT',body:JSON.stringify(data)});
    loadAdminProducts();
  };
}

// Init
fetchMe().then(loadData);
