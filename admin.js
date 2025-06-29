// public/admin.js
// Admin dashboard: compact table + inline stock editing + Add New Product form

document.addEventListener('DOMContentLoaded', async () => {
  // Utility to fetch JSON with credentials
  const apiJson = (path, opts = {}) =>
    fetch(path, { credentials: 'include', ...opts }).then(r => r.json());

  // Category-specific dynamic fields configuration
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

  // Fetch categories for forms
  let categories = [];
  try {
    categories = await apiJson('/api/categories');
  } catch (err) {
    console.error('Failed to load categories', err);
  }

  // Verify admin access
  const { user } = await apiJson('/api/me');
  if (!user || !user.is_admin) {
    alert('Access denied');
    return window.location.replace('/');
  }

  // DOM references
  const btnHome = document.getElementById('btn-home');
  const btnLogout = document.getElementById('btn-logout-admin');
  const prodBtn = document.getElementById('admin-products');
  const orderBtn = document.getElementById('admin-orders');
  const prodSec = document.getElementById('admin-products-section');
  const orderSec = document.getElementById('admin-orders-section');
  const newProdBtn = document.getElementById('new-product');
  const listContainer = document.getElementById('product-admin-list');
  const ordersList = document.getElementById('orders-list');

  // Navigation actions
  btnHome.onclick = () => window.location.replace('/');
  btnLogout.onclick = async () => {
    await apiJson('/api/logout', { method: 'POST' });
    window.location.replace('/');
  };

  prodBtn.onclick = () => {
    prodSec.classList.remove('hidden');
    orderSec.classList.add('hidden');
    loadProductsTable();
  };

  orderBtn.onclick = async () => {
    orderSec.classList.remove('hidden');
    prodSec.classList.add('hidden');
    const ords = await apiJson('/api/admin/orders');
    ordersList.innerHTML = ords
      .map(
        o => `<li>Order #${o.id} by ${o.username || 'Guest'}: $${
          o.total.toFixed(2)
        } on ${new Date(o.created_at).toLocaleString()}</li>`
      )
      .join('');
  };

  // New product button
  newProdBtn.onclick = () => editProduct();

  // Load and render products table with inline stock input
  async function loadProductsTable() {
    let prods = [];
    try {
      prods = await apiJson('/api/admin/products');
    } catch (err) {
      console.error('Failed to load products', err);
      return;
    }

    // Build table markup
    const rows = prods
      .map(
        p => `
      <tr>
        <td>${p.id}</td>
        <td>${p.name}</td>
        <td>${p.category}</td>
        <td>$${p.price.toFixed(2)}</td>
        <td><input type="number" class="stock-input" data-id="${p.id}" value="${p.stock}" style="width:60px" /></td>
        <td>
          <button class="edit-btn" data-id="${p.id}">Edit</button>
          <button class="del-btn" data-id="${p.id}">Delete</button>
        </td>
      </tr>`
      )
      .join('');

    listContainer.innerHTML = `
      <table class="table">
        <thead>
          <tr>
            <th>ID</th><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;

    // Inline stock save
    listContainer.querySelectorAll('.stock-input').forEach(input => {
      input.onchange = async () => {
        const id = input.dataset.id;
        const stock = input.value;
        await fetch(`/api/admin/inventory/${id}`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stock })
        });
      };
    });

    // Edit buttons
    listContainer.querySelectorAll('.edit-btn').forEach(btn => {
      btn.onclick = () => {
        const prod = prods.find(p => p.id == btn.dataset.id);
        editProduct(prod);
      };
    });

    // Delete buttons
    listContainer.querySelectorAll('.del-btn').forEach(btn => {
      btn.onclick = async () => {
        if (!confirm('Delete this product?')) return;
        await fetch(`/api/admin/products/${btn.dataset.id}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        loadProductsTable();
      };
    });
  }

  // Render the product form for new/edit
  function editProduct(p = {}) {
    const isNew = !p.id;
    prodSec.classList.remove('hidden');
    orderSec.classList.add('hidden');
    listContainer.innerHTML = '';

    // Build form container
    const form = document.createElement('div');
    form.className = 'admin-item card';
    form.innerHTML = `
      <h3>${isNew ? 'New' : 'Edit'} Product</h3>
      <label>Name</label>
      <input id="f-name" value="${p.name || ''}" /><br />
      <label>Category</label>
      <select id="f-cat">
        ${categories
          .map(c =>
            `<option value="${c.id}"${c.name === p.category ? ' selected' : ''}>${c.name}</option>`
          )
          .join('')}
      </select><br />
      <label>Price</label>
      <input id="f-price" type="number" value="${p.price || 0}" /><br />
      <label>Description</label>
      <textarea id="f-desc">${p.description || ''}</textarea><br />
      <div id="dynamic-fields"></div>
      <label>Image</label>
      <input id="f-image" type="file" /><br />
      <label>Stock</label>
      <input id="f-stock" type="number" value="${p.stock || 0}" /><br />
      <button id="save-btn">Save</button>
      <button id="cancel-btn">Cancel</button>
    `;
    listContainer.appendChild(form);

    // Dynamic category fields rendering
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
          fld.options.forEach(optVal => {
            const opt = document.createElement('option');
            opt.value = optVal;
            opt.textContent = optVal;
            if (p[fld.id] === optVal) opt.selected = true;
            input.appendChild(opt);
          });
        } else {
          input = document.createElement('input');
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

    // Cancel
    form.querySelector('#cancel-btn').onclick = loadProductsTable;

    // Save
    form.querySelector('#save-btn').onclick = async () => {
      const fd = new FormData();
      fd.append('name', form.querySelector('#f-name').value);
      fd.append('category_id', form.querySelector('#f-cat').value);
      fd.append('price', form.querySelector('#f-price').value);
      fd.append('description', form.querySelector('#f-desc').value);
      fd.append('stock', form.querySelector('#f-stock').value);
      const imgFile = form.querySelector('#f-image').files[0];
      if (imgFile) fd.append('image', imgFile);
      const selectedCat = categories.find(c => c.id == form.querySelector('#f-cat').value).name;
      (categoryFields[selectedCat] || []).forEach(fld => {
        fd.append(fld.id, form.querySelector('#' + fld.id).value);
      });

      const url = isNew ? '/api/admin/products' : `/api/admin/products/${p.id}`;
      const method = isNew ? 'POST' : 'PUT';
      const res = await fetch(url, { method, body: fd, credentials: 'include' });
      if (res.ok) alert('✅ Product saved successfully');
      else alert('❌ Error saving product');
      loadProductsTable();
    };
  }

  // Initial view
  prodBtn.click();
});
