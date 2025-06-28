// app.js: Browse/search/sort, auth, cart
let user=null, categories=[], products=[], filtered=[], cart=[];
const apiJson=(path,opts={})=>fetch(path,{credentials:'include',...opts}).then(r=>r.json());

document.addEventListener('DOMContentLoaded',()=>{
  // Refs
  const btnLogin=document.getElementById('btn-login');
  const btnRegister=document.getElementById('btn-register');
  const btnAdmin=document.getElementById('btn-admin');
  const btnLogout=document.getElementById('btn-logout');
  const btnCart=document.getElementById('btn-cart');
  const userInfo=document.getElementById('user-info');
  const modalLogin=document.getElementById('modal-login');
  const modalRegister=document.getElementById('modal-register');
  const loginUser=document.getElementById('login-username');
  const loginPass=document.getElementById('login-password');
  const regName=document.getElementById('reg-fullname');
  const regUser=document.getElementById('reg-username');
  const regAddr=document.getElementById('reg-address');
  const regPass=document.getElementById('reg-password');
  const loginErr=document.getElementById('login-error');
  const regErr=document.getElementById('reg-error');
  const closes=document.querySelectorAll('.modal-close');
  const searchInput=document.getElementById('search-input');
  const sortSelect=document.getElementById('sort-select');
  const catFilter=document.getElementById('category-filter');
  const grid=document.getElementById('products-grid');
  const cartPanel=document.getElementById('cart-panel');
  const cartItems=document.getElementById('cart-items');
  const cartCount=document.getElementById('cart-count');
  const cartTotal=document.getElementById('cart-total');
  const checkoutBtn=document.getElementById('checkout-btn');
  const closeCartBtn=document.getElementById('close-cart');

  // Modal toggles
  btnLogin.onclick=()=>modalLogin.classList.remove('hidden');
  btnRegister.onclick=()=>modalRegister.classList.remove('hidden');
  closes.forEach(b=>b.onclick=()=>{modalLogin.classList.add('hidden');modalRegister.classList.add('hidden');loginErr.textContent='';regErr.textContent='';});

  // Render auth/UI
  function renderAuth(){
    if(user){
      btnLogin.classList.add('hidden');btnRegister.classList.add('hidden');btnLogout.classList.remove('hidden');btnCart.classList.remove('hidden');
      userInfo.textContent=user.username;
      if(user.is_admin) btnAdmin.classList.remove('hidden'); else btnAdmin.classList.add('hidden');
    } else {
      btnLogin.classList.remove('hidden');btnRegister.classList.remove('hidden');btnLogout.classList.add('hidden');btnCart.classList.add('hidden');
      userInfo.textContent='';btnAdmin.classList.add('hidden');
    }
  }

  // Fetch current user
  async function fetchUser(){
    const { user: u } = await apiJson('/api/me');
    user=u; renderAuth();
  }

  // Login
  document.getElementById('login-submit').onclick=async()=>{
    const res=await apiJson('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:loginUser.value,password:loginPass.value})});
    if(res.error) loginErr.textContent=res.error;
    else{modalLogin.classList.add('hidden');await fetchUser();loadAll();}
  };
  // Register
  document.getElementById('reg-submit').onclick=async()=>{
    const res=await apiJson('/api/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({full_name:regName.value,shipping_address:regAddr.value,username:regUser.value,password:regPass.value})});
    if(res.error) regErr.textContent=res.error;
    else{modalRegister.classList.add('hidden');await fetchUser();loadAll();}
  };
  // Logout
  btnLogout.onclick=async()=>{await apiJson('/api/logout',{method:'POST'});user=null;renderAuth();};

  // Load categories & products
  async function loadAll(){
    categories=await apiJson('/api/categories');
    products=await apiJson('/api/products');
    populateCategories(); applyFilters();
  }
  function populateCategories(){
    catFilter.innerHTML='<option value="">All Categories</option>'+categories.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
  }

  // Filters & sorting
  function applyFilters(){
    const term=searchInput.value.toLowerCase();
    const sort=sortSelect.value;
    const cat=catFilter.value;
    filtered=products.filter(p=>(!cat||p.category_id==cat)).filter(p=>p.name.toLowerCase().includes(term));
    if(sort==='price-asc') filtered.sort((a,b)=>a.price-b.price);
    else if(sort==='price-desc') filtered.sort((a,b)=>b.price-a.price);
    renderProducts();
  }

  function renderProducts(){
    grid.innerHTML=filtered.map(p=>`
      <div class="card">
        <img src="${p.image_url||'https://via.placeholder.com/300x150'}" alt="${p.name}">
        <h3>${p.name}</h3>
        <p>${p.category}</p>
        <p>$${p.price.toFixed(2)}</p>
        <button ${p.stock?'':'disabled'} data-id="${p.id}">Add to Cart</button>
      </div>
    `).join('');
    document.querySelectorAll('.card button').forEach(b=>b.onclick=()=>addToCart(b.dataset.id));
  }

  // Cart functionality
  function addToCart(id){
    const ex=cart.find(i=>i.productId==id);
    const prod=products.find(p=>p.id==id);
    if(!ex) cart.push({productId:id,quantity:1});
    else if(ex.quantity<prod.stock) ex.quantity++;
    renderCart();
  }
  function renderCart(){
    cartItems.innerHTML=cart.map(i=>{const p=products.find(x=>x.id==i.productId);return `<li>${p.name} x${i.quantity} - $${(p.price*i.quantity).toFixed(2)} <button data-id="${i.productId}">×</button></li>`}).join('');
    document.querySelectorAll('#cart-items button').forEach(b=>b.onclick=()=>{cart=cart.filter(i=>i.productId!=b.dataset.id);renderCart();});
    const total=cart.reduce((s,i)=>s+products.find(p=>p.id==i.productId).price*i.quantity,0);
    cartTotal.textContent=total.toFixed(2); cartCount.textContent=cart.reduce((s,i)=>s+i.quantity,0);
  }
  btnCart.onclick=()=>cartPanel.classList.remove('hidden');
  closeCartBtn.onclick=()=>cartPanel.classList.add('hidden');
  checkoutBtn.onclick=async()=>{if(!cart.length)return alert('Empty cart');const res=await apiJson('/api/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({cart})});if(res.success){alert('Order '+res.orderId);cart=[];await loadAll();cartPanel.classList.add('hidden');}else alert(res.error);};

  // Filter listeners
  searchInput.oninput=applyFilters;
  sortSelect.onchange=applyFilters;
  catFilter.onchange=applyFilters;

  // Init
  fetchUser().then(loadAll);
});
