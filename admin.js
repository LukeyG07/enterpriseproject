// admin.js: Separate admin page logic
const apiJson=(path,opts={})=>fetch(path,{credentials:'include',...opts}).then(r=>r.json());
(async()=>{
  // Verify admin
  const { user }=await apiJson('/api/me');
  if(!user||!user.is_admin){alert('Access denied');return window.location='/';}

  // Refs
  const btnHome=document.getElementById('btn-home');
  const btnLogout=document.getElementById('btn-logout-admin');
  const prodBtn=document.getElementById('admin-products');
  const orderBtn=document.getElementById('admin-orders');
  const prodSec=document.getElementById('admin-products-section');
  const orderSec=document.getElementById('admin-orders-section');
  const newProdBtn=document.getElementById('new-product');
  const prodList=document.getElementById('product-admin-list');
  const ordersList=document.getElementById('orders-list');

  btnHome.onclick=()=>window.location='/';
  btnLogout.onclick=async()=>{await apiJson('/api/logout',{method:'POST'});window.location='/';};

  let categories=[];
  async function loadAll(){
    categories=await apiJson('/api/categories');
    loadProducts();
  }

  prodBtn.onclick=()=>{prodSec.classList.remove('hidden');orderSec.classList.add('hidden');loadProducts();};
  orderBtn.onclick=async()=>{orderSec.classList.remove('hidden');prodSec.classList.add('hidden');const ords=await apiJson('/api/admin/orders');ordersList.innerHTML=ords.map(o=>`<li>Order #${o.id} by ${o.username||'Guest'}: $${o.total.toFixed(2)} on ${new Date(o.created_at).toLocaleString()}</li>`).join('');};

  async function loadProducts(){
    const prods=await apiJson('/api/admin/products');
    prodList.innerHTML=prods.map(p=>`
      <div class="admin-item card">
        <img src="${p.image_url||'https://via.placeholder.com/300x150'}" style="width:100%;height:100px;object-fit:cover;border-radius:4px;margin-bottom:8px;">
        <strong>${p.name}</strong><br>${p.category} | $${p.price.toFixed(2)}<br>Stock: ${p.stock}<br>
        <button data-id="${p.id}" class="edit-btn">Edit</button>
        <button data-id="${p.id}" class="del-btn">Delete</button>
      </div>
    `).join('');
    document.querySelectorAll('.edit-btn').forEach(b=>b.onclick=()=>editProduct(prods.find(x=>x.id==b.dataset.id)));
    document.querySelectorAll('.del-btn').forEach(b=>b.onclick=async()=>{if(confirm('Delete?')){await fetch(`/api/admin/products/${b.dataset.id}`,{method:'DELETE',credentials:'include'});loadProducts();}});
  }

  const categoryFields={
    CPU:[{id:'socket',label:'Socket'}],
    GPU:[{id:'memory_size',label:'Memory (GB)',type:'number'}],
    Motherboard:[{id:'form_factor',label:'Form Factor'}],
    RAM:[{id:'ram_type',label:'RAM Type'},{id:'capacity',label:'Capacity (GB)',type:'number'}],
    PSU:[{id:'wattage',label:'Wattage (W)',type:'number'},{id:'efficiency',label:'Efficiency'}],
    Case:[{id:'case_size',label:'Case Size',type:'select',options:['ATX','MicroATX','Mini-ITX']}],
    Fan:[{id:'fan_size',label:'Fan Size (mm)',type:'number'}],
    'CPU Cooler':[ {id:'cooler_type',label:'Cooler Type'} ]
  };

  newProdBtn.onclick=()=>editProduct();
  function editProduct(p={}){
    const isNew=!p.id;
    prodList.innerHTML='';
    const form=document.createElement('div');form.className='admin-item card';
    form.innerHTML=`
      <h3>${isNew?'New':'Edit'} Product</h3>
      <label>Name</label><input id="f-name" value="${p.name||''}"><br>
      <label>Category</label><select id="f-cat">${categories.map(c=>`<option value="${c.id}"${c.name===p.category?' selected':''}>${c.name}</option>`).join('')}</select><br>
      <label>Price</label><input id="f-price" type="number" value="${p.price||0}"><br>
      <label>Description</label><textarea id="f-desc">${p.description||''}</textarea><br>
      <div id="dynamic-fields"></div>
      <label>Image</label><input id="f-image" type="file"><br>
      <label>Stock</label><input id="f-stock" type="number" value="${p.stock||0}"><br>
      <button id="save-btn">Save</button>
      <button id="cancel-btn">Cancel</button>
    `;
    prodList.appendChild(form);
    const dyn=form.querySelector('#dynamic-fields');
    const cat=form.querySelector('#f-cat');
    function renderFields(){
      dyn.innerHTML='';
      const cname=categories.find(c=>c.id==cat.value).name;
      (categoryFields[cname]||[]).forEach(fld=>{
        const label=document.createElement('label');label.textContent=fld.label;dyn.appendChild(label);
        let inp;
        if(fld.type==='select'){
          inp=document.createElement('select');fld.options.forEach(o=>{const opt=document.createElement('option');opt.value=o;opt.textContent=o;if(p[fld.id]===o) opt.selected=true;inp.appendChild(opt);});
        } else {
          inp=document.createElement('input');inp.type=fld.type||'text';inp.value=p[fld.id]||'';
        }
        inp.id=fld.id;dyn.appendChild(inp);dyn.appendChild(document.createElement('br'));
      });
    }
    cat.onchange=renderFields;renderFields();
    form.querySelector('#cancel-btn').onclick=loadProducts;
    form.querySelector('#save-btn').onclick=async()=>{
      const fd=new FormData();
      fd.append('name',form.querySelector('#f-name').value);
      fd.append('category_id',form.querySelector('#f-cat').value);
      fd.append('price',form.querySelector('#f-price').value);
      fd.append('description',form.querySelector('#f-desc').value);
      fd.append('stock',form.querySelector('#f-stock').value);
      const img=form.querySelector('#f-image').files[0];if(img)fd.append('image',img);
      const cname=categories.find(c=>c.id==form.querySelector('#f-cat').value).name;
      (categoryFields[cname]||[]).forEach(fld=>fd.append(fld.id,form.querySelector('#'+fld.id).value));
      const url=isNew?'/api/admin/products':`/api/admin/products/${p.id}`;
      const method=isNew?'POST':'PUT';
      await fetch(url,{method,body:fd,credentials:'include'});
      loadProducts();
    };
  }

  await loadAll();
})();
