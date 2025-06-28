// Frontend logic with dynamic forms and UX improvements
let user=null, categories=[], products=[], cart=[];
const api=(path,opts={})=>fetch(path,{credentials:'include',headers:{'Content-Type':'application/json'},...opts}).then(r=>r.json());

// DOM refs
document.addEventListener('DOMContentLoaded',()=>{
  // UI elements
  const btnLogin=document.getElementById('btn-login');
  const btnRegister=document.getElementById('btn-register');
  const btnLogout=document.getElementById('btn-logout');
  const btnCart=document.getElementById('btn-cart');
  const userInfo=document.getElementById('user-info');
  const modalLogin=document.getElementById('modal-login');
  const modalRegister=document.getElementById('modal-register');
  const loginSubmit=document.getElementById('login-submit');
  const regSubmit=document.getElementById('reg-submit');
  const loginUser=document.getElementById('login-username');
  const loginPass=document.getElementById('login-password');
  const regName=document.getElementById('reg-fullname');
  const regUser=document.getElementById('reg-username');
  const regAddr=document.getElementById('reg-address');
  const regPass=document.getElementById('reg-password');
  const loginErr=document.getElementById('login-error');
  const regErr=document.getElementById('reg-error');
  const modalCloses=document.querySelectorAll('.modal-close');
  const categoryFilter=document.getElementById('category-filter');
  const productsGrid=document.getElementById('products-grid');
  const browseSection=document.getElementById('browse');
  const cartPanel=document.getElementById('cart-panel');
  const cartItems=document.getElementById('cart-items');
  const cartTotal=document.getElementById('cart-total');
  const cartCount=document.getElementById('cart-count');
  const checkoutBtn=document.getElementById('checkout');
  const closeCartBtn=document.getElementById('close-cart');
  const adminPanel=document.getElementById('admin-panel');
  const adminProdBtn=document.getElementById('admin-products');
  const adminOrderBtn=document.getElementById('admin-orders');
  const adminProdSec=document.getElementById('admin-products-section');
  const adminOrderSec=document.getElementById('admin-orders-section');
  const newProdBtn=document.getElementById('new-product');
  const prodAdminList=document.getElementById('product-admin-list');
  const ordersList=document.getElementById('orders-list');

  // modal handlers
  [btnLogin,btnRegister].forEach(btn=>btn.addEventListener('click',()=>{
    if(btn===btnLogin) modalLogin.classList.remove('hidden');
    else modalRegister.classList.remove('hidden');
  }));
  modalCloses.forEach(b=>b.addEventListener('click',()=>{modalLogin.classList.add('hidden');modalRegister.classList.add('hidden');}));

  // auth
  const renderAuth=()=>{
    if(user){
      btnLogin.classList.add('hidden'); btnRegister.classList.add('hidden');
      btnLogout.classList.remove('hidden'); btnCart.classList.remove('hidden');
      userInfo.textContent=user.username;
      if(user.is_admin) adminPanel.classList.remove('hidden');
    } else {
      btnLogin.classList.remove('hidden'); btnRegister.classList.remove('hidden');
      btnLogout.classList.add('hidden'); btnCart.classList.add('hidden');
      userInfo.textContent=''; adminPanel.classList.add('hidden');
    }
  };
  loginSubmit.addEventListener('click',async()=>{
    const res=await api('/api/login',{method:'POST',body:JSON.stringify({username:loginUser.value,password:loginPass.value})});
    if(res.error) loginErr.textContent=res.error;
    else{modalLogin.classList.add('hidden');loginErr.textContent='';await fetchUser();loadAll();}
  });
  regSubmit.addEventListener('click',async()=>{
    const res=await api('/api/register',{method:'POST',body:JSON.stringify({
      full_name:regName.value,shipping_address:regAddr.value,
      username:regUser.value,password:regPass.value
    })});
    if(res.error) regErr.textContent=res.error;
    else{modalRegister.classList.add('hidden');regErr.textContent='';await fetchUser();loadAll();}
  });
  btnLogout.addEventListener('click',async()=>{await api('/api/logout',{method:'POST'});user=null;renderAuth();});

  // fetch user
  const fetchUser=async()=>{ const res=await api('/api/me'); user=res.user; renderAuth(); };

  // load categories & products
  const loadAll=async()=>{
    categories=await api('/api/categories');
    products=await api('/api/products');
    renderCategories(); renderProducts(); renderCart();
  };

  // render categories filter
  const renderCategories=()=>{
    categoryFilter.innerHTML = '<option value="">All Categories</option>'+categories.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
    categoryFilter.onchange=renderProducts;
  };
  // render products
  const renderProducts=()=>{
    const cid=categoryFilter.value;
    const list=cid?products.filter(p=>p.category_id==cid):products;
    productsGrid.innerHTML=list.map(p=>`
      <div class="card">
        <h3>${p.name}</h3>
        <p>${p.category}</p>
        <p>$${p.price.toFixed(2)}</p>
        <p>Stock: ${p.stock}</p>
        <button ${p.stock? '':'disabled'} data-id="${p.id}">Add to Cart</button>
      </div>
    `).join('');
    document.querySelectorAll('.card button').forEach(b=>b.onclick=()=>addToCart(b.dataset.id));
  };

  // cart
  const addToCart=id=>{ const ex=cart.find(i=>i.productId==id);
    if(!ex) cart.push({productId:id,quantity:1});
    else if(ex.quantity<products.find(p=>p.id==id).stock) ex.quantity++;
    renderCart(); };
  const renderCart=()=>{
    cartItems.innerHTML=cart.map(i=>{
      const p=products.find(x=>x.id==i.productId);
      return `<li>${p.name} x${i.quantity} - $${(p.price*i.quantity).toFixed(2)} <button data-id="${i.productId}">x</button></li>`;
    }).join('');
    document.querySelectorAll('#cart-items button').forEach(b=>b.onclick=()=>{cart=cart.filter(i=>i.productId!=b.dataset.id);renderCart()});
    const total=cart.reduce((s,i)=>s+products.find(p=>p.id==i.productId).price*i.quantity,0);
    cartTotal.textContent=total.toFixed(2); cartCount.textContent=cart.reduce((s,i)=>s+i.quantity,0);
  };
  btnCart.onclick=()=>cartPanel.classList.remove('hidden'); closeCartBtn.onclick=()=>cartPanel.classList.add('hidden');
  checkoutBtn.onclick=async()=>{
    if(!cart.length) return alert('Empty cart');
    const res=await api('/api/checkout',{method:'POST',body:JSON.stringify({cart})});
    if(res.success){ alert('Order '+res.orderId);cart=[];await loadAll();cartPanel.classList.add('hidden'); }
    else alert(res.error);
  };

  // Admin UI
  adminProdBtn.onclick=()=>{adminProdSec.classList.remove('hidden');adminOrderSec.classList.add('hidden');loadAdminProducts();};
  adminOrderBtn.onclick=()=>{adminOrderSec.classList.remove('hidden');adminProdSec.classList.add('hidden');loadAdminOrders();};

  // Dynamic fields mapping
  const categoryFields={
    'CPU':[{id:'socket',label:'Socket'}],
    'GPU':[{id:'memory_size',label:'Memory (GB)',type:'number'}],
    'Motherboard':[{id:'form_factor',label:'Form Factor'}],
    'RAM':[{id:'ram_type',label:'RAM Type'},{id:'capacity',label:'Capacity (GB)',type:'number'}],
    'PSU':[{id:'wattage',label:'Wattage (W)',type:'number'},{id:'efficiency',label:'Efficiency'}],
    'Case':[{id:'case_size',label:'Case Size',type:'select',options:['ATX','MicroATX','Mini-ITX']}],
    'Fan':[{id:'fan_size',label:'Fan Size (mm)',type:'number'}],
    'CPU Cooler':[{id:'cooler_type',label:'Cooler Type'}]
  };

  // Admin products
  async function loadAdminProducts(){
    const list=await api('/api/admin/products');
    prodAdminList.innerHTML=list.map(p=>`
      <div class="card admin-item">
        <strong>${p.name}</strong><br>${p.category}<br>$${p.price.toFixed(2)} | Stock ${p.stock}<br>
        <button data-id="${p.id}" class="edit">Edit</button>
        <button data-id="${p.id}" class="del">Delete</button>
      </div>
    `).join('');
    list.forEach(p=>{
      const ed=prodAdminList.querySelector(`button.edit[data-id="${p.id}"]`);
      const dl=prodAdminList.querySelector(`button.del[data-id="${p.id}"]`);
      ed.onclick=()=>editProduct(p);
      dl.onclick=async()=>{await api(`/api/admin/products/${p.id}`,{method:'DELETE'});loadAdminProducts();};
    });
  }
  async function loadAdminOrders(){
    const list=await api('/api/admin/orders');
    ordersList.innerHTML=list.map(o=>`<li>Order #${o.id} by ${o.username||'Guest'}: $${o.total.toFixed(2)} on ${new Date(o.created_at).toLocaleString()}</li>`).join('');
  }

  newProdBtn.onclick=()=>editProduct();
  function editProduct(p={}){
    const isNew=!p.id;
    const form=document.createElement('div');form.className='card admin-item';
    form.innerHTML=`
      <input id="f-name" placeholder="Name" value="${p.name||''}"><br>
      <select id="f-cat">${categories.map(c=>`<option value="${c.id}"${p.category_id==c.id?' selected':''}>${c.name}</option>`).join('')}</select><br>
      <input id="f-price" type="number" placeholder="Price" value="${p.price||0}"><br>
      <textarea id="f-desc" placeholder="Description">${p.description||''}</textarea><br>
      <div id="dynamic-fields"></div>
      <input id="f-stock" type="number" placeholder="Stock" value="${p.stock||0}"><br>
      <button id="save">Save</button>
      <button id="cancel">Cancel</button>
    `;
    prodAdminList.prepend(form);
    const dyn=document.getElementById('dynamic-fields');
    const catSelect=form.querySelector('#f-cat');
    function renderFields(){
      dyn.innerHTML='';
      const cname=categories.find(c=>c.id==catSelect.value).name;
      (categoryFields[cname]||[]).forEach(fld=>{
        if(fld.type==='select'){
          const sel=document.createElement('select');sel.id=fld.id;
          fld.options.forEach(o=>sel.innerHTML+=`<option>${o}</option>`);
          dyn.append(document.createTextNode(fld.label));dyn.append(sel);
        } else {
          const inp=document.createElement('input');
          inp.id=fld.id;inp.type=fld.type||'text';inp.placeholder=fld.label;inp.value=p[fld.id]||'';
          dyn.append(inp);
        }
        dyn.append(document.createElement('br'));
      });
    }
    catSelect.onchange=renderFields; renderFields();
    form.querySelector('#cancel').onclick=loadAdminProducts;
    form.querySelector('#save').onclick=async()=>{
      const data={
        name:form.querySelector('#f-name').value,
        category_id:form.querySelector('#f-cat').value,
        price:form.querySelector('#f-price').value,
        description:form.querySelector('#f-desc').value,
        stock:form.querySelector('#f-stock').value
      };
      // include dynamic
      const cname=categories.find(c=>c.id==data.category_id).name;
      (categoryFields[cname]||[]).forEach(fld=>{
        data[fld.id]=form.querySelector('#'+fld.id).value;
      });
      if(isNew) await api('/api/admin/products',{method:'POST',body:JSON.stringify(data)});
      else await api(`/api/admin/products/${p.id}`,{method:'PUT',body:JSON.stringify(data)});
      loadAdminProducts();
    };
  }

  // init
  fetchUser().then(loadAll);
});
