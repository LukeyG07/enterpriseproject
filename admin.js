// admin.js: Separate admin page logic
let categories = [];

const apiJson = (path, opts = {}) =>
  fetch(path, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...opts })
    .then(r => r.json());

(async () => {
  // Check admin
  const me = await apiJson('/api/me');
  if (!me.user || !me.user.is_admin) {
    alert('Access denied');
    window.location = '/';
    return;
  }

  // DOM refs
  const btnHome = document.getElementById('btn-home');
  const btnLogout = document.getElementById('btn-logout-admin');
  const prodBtn = document.getElementById('admin-products');
  const orderBtn = document.getElementById('admin-orders');
  const prodSection = document.getElementById('admin-products-section');
  const orderSection = document.getElementById('admin-orders-section');
  const newProdBtn = document.getElementById('new-product');
  const prodList = document.getElementById('product-admin-list');
  const ordersList = document.getElementById('orders-list');

  btnHome.onclick = () => window.location = '/';
  btnLogout.onclick = async () => {
    await apiJson('/api/logout', { method: 'POST' });
    window.location = '/';
  };

  // Load data
  async function loadAll() {
    categories = await apiJson('/api/categories');
    loadProducts();
  }

  // Show products panel
  prodBtn.onclick = () => {
    prodSection.classList.remove('hidden');
    orderSection.classList.add('hidden');
    loadProducts();
  };

  // Show orders panel
  orderBtn.onclick = async () => {
    prodSection.classList.add('hidden');
    orderSection.classList.remove('hidden');
    const orders = await apiJson('/api/admin/orders');
    ordersList.innerHTML = orders.map(o =>
      `<li>Order #${o.id} by ${o.username || 'Guest'}: $${o.total.toFixed(2)} on ${new Date(o.created_at).toLocaleString()}</li>`
    ).join('');
  };

  // Load products list
  async function loadProducts() {
    const prods = await apiJson('/api/admin/products');
    prodList.innerHTML = prods.map(p => `
      <div class="admin-item card">
        <img src="${p.image_url || 'https://via.placeholder.com/300x150'}" alt="${p.name}" style="width:100%;height:100px;object-fit:cover;border-radius:4px;margin-bottom:8px;">
        <strong>${p.name}</strong><br>
        ${p.category} | $${p.price.toFixed(2)} | Stock: ${p.stock}<br>
        <button data-id="${p.id}" class="edit-btn">Edit</button>
        <button data-id="${p.id}" class="del-btn">Delete</button>
      </div>
    `).join('');
    // Bind edit/delete
    document.querySelectorAll('.edit-btn').forEach(b => {
      b.onclick = () => editProduct(prods.find(x => x.id == b.dataset.id));
    });
    document.querySelectorAll('.del-btn').forEach(b => {
      b.onclick = async () => {
        if (confirm('Delete this product?')) {
          await fetch(`/api/admin/products/${b.dataset.id}`, { method: 'DELETE', credentials: 'include' });
          loadProducts();
        }
      };
    });
  }

  // Dynamic fields mapping
  const categoryFields = {
    CPU: [{ id: 'socket', label: 'Socket' }],
    GPU: [{ id: 'memory_size', label: 'Memory (GB)', type: 'number' }],
    Motherboard: [{ id: 'form_factor', label: 'Form Factor' }],
    RAM: [
      { id: 'ram_type', label: 'RAM Type' },
      { id: 'capacity', label: 'Capacity (GB)', type: 'number' }
    ],
    PSU: [
      { id: 'wattage', label: 'Wattage (W)', type: 'number' },
      { id: 'efficiency', label: 'Efficiency' }
    ],
    Case: [
      { id: 'case_size', label: 'Case Size', type: 'select', options: ['ATX', 'MicroATX', 'Mini-ITX'] }
    ],
    Fan: [{ id: 'fan_size', label: 'Fan Size (mm)', type: 'number' }],
    'CPU Cooler': [{ id: 'cooler_type', label: 'Cooler Type' }]
  };

  // New/Edit form
  newProdBtn.onclick = () => editProduct();
  function editProduct(p = {}) {
    const isNew = !p.id;
    prodList.innerHTML = '';
    const form = document.createElement('div');
    form.className = 'admin-item card';
    form.innerHTML = `
      <h3>${isNew ? 'New' : 'Edit'} Product</h3>
      <label>Name</label>
      <input id="f-name" value="${p.name || ''}"><br>
      <label>Category</label>
      <select id="f-cat">${categories.map(c => `
        <option value="${c.id}"${c.name === p.category ? ' selected' : ''}>${c.name}</option>`).join('')}
      </select><br>
      <label>Price</label>
      <input id="f-price" type="number" value="${p.price || 0}"><br>
      <label>Description</label>
      <textarea id="f-desc">${p.description || ''}</textarea><br>
      <div id="dynamic-fields"></div>
      <label>Image</label>
      <input id="f-image" type="file"><br>
      <label>Stock</label>
      <input id="f-stock" type="number" value="${p.stock || 0}"><br>
      <button id="save-btn">Save</button>
      <button id="cancel-btn">Cancel</button>
    `;
    prodList.appendChild(form);

    const dyn = form.querySelector('#dynamic-fields');
    const catSelect = form.querySelector('#f-cat');
    function renderFields() {
      dyn.innerHTML = '';
      const cname = categories.find(c => c.id == catSelect.value).name;
      (categoryFields[cname] || []).forEach(fld => {
        const label = document.createElement('label');
        label.textContent = fld.label;
        dyn.appendChild(label);
        let input;
        if (fld.type === 'select') {
          input = document.createElement('select');
          fld.options.forEach(o => {
            const opt = document.createElement('option');
            opt.value = o;
            opt.textContent = o;
            if (p[fld.id] === o) opt.selected = true;
            input.appendChild(opt);
          });
        } else {
          input = document.createElement('input');
          input.id = fld.id;
          input.type = fld.type || 'text';
          input.value = p[fld.id] || '';
        }
        input.id = fld.id;
        dyn.appendChild(input);
        dyn.appendChild(document.createElement('br'));
      });
    }
    catSelect.onchange = renderFields;
    renderFields();

    form.querySelector('#cancel-btn').onclick = loadProducts;
    form.querySelector('#save-btn').onclick = async () => {
      const fd = new FormData();
      fd.append('name', form.querySelector('#f-name').value);
      fd.append('category_id', form.querySelector('#f-cat').value);
      fd.append('price', form.querySelector('#f-price').value);
      fd.append('description', form.querySelector('#f-desc').value);
      fd.append('stock', form.querySelector('#f-stock').value);
      const imgInput = form.querySelector('#f-image');
      if (imgInput.files[0]) fd.append('image', imgInput.files[0]);
      const cname = categories.find(c => c.id == form.querySelector('#f-cat').value).name;
      (categoryFields[cname] || []).forEach(fld => {
        fd.append(fld.id, form.querySelector('#' + fld.id).value);
      });
      const url = isNew ? '/api/admin/products' : `/api/admin/products/${p.id}`;
      const method = isNew ? 'POST' : 'PUT';
      await fetch(url, { method, body: fd, credentials: 'include' });
      loadProducts();
    };
  }

  // Initial load
  await loadAll();
})();
