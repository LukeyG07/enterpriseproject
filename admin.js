// public/admin.js
// Admin dashboard: compact table + inline stock editing + Add New Product form
theClient(() => {
  // Shorthand for authenticated JSON requests
  const apiJson = (path, opts = {}) =>
    fetch(path, { credentials: 'include', ...opts }).then(r => r.json());

  // Category-specific dynamic fields
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

  (async () => {
    // --- Verify admin user ---
    const { user } = await apiJson('/api/me');
    if (!user || !user.is_admin) {
      alert('Access denied');
      return (window.location = '/');
    }

    // --- DOM references ---
    const btnHome = document.getElementById('btn-home');
    const btnLogout = document.getElementById('btn-logout-admin');
    const prodBtn = document.getElementById('admin-products');
    const orderBtn = document.getElementById('admin-orders');
    const prodSec = document.getElementById('admin-products-section');
    const orderSec = document.getElementById('admin-orders-section');
    const newProdBtn = document.getElementById('new-product');
    const listContainer = document.getElementById('product-admin-list');
    const ordersList = document.getElementById('orders-list');

    // --- Nav actions ---
    btnHome.onclick = () => (window.location = '/');
    btnLogout.onclick = async () => {
      await apiJson('/api/logout', { method: 'POST' });
      window.location = '/';
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
          o =>
            `<li>Order #${o.id} by ${o.username || 'Guest'}: $${
              o.total.toFixed(2)
            } on ${new Date(o.created_at).toLocaleString()}</li>`
        )
        .join('');
    };

    // --- Add New Product button ---
    newProdBtn.onclick = () => editProduct();

    // --- Load & render products table ---
    async function loadProductsTable() {
      const prods = await apiJson('/api/admin/products');
      // Build HTML table
      let html = `
        <table id="admin-products-table" class="table">
          <thead>
            <tr>
              <th>ID</th><th>Name</th><th>Category</th><th>Price</th>
              <th>Stock</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
      `;
      prods.forEach(p => {
        html += `
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
          </tr>
        `;
      });
      html += '</tbody></table>';

      listContainer.innerHTML = html;

      // Inline stock update
      listContainer.querySelectorAll('.stock-input').forEach(input => {
        input.onchange = async () => {
          const id = input.dataset.id;
          const stock = input.value;
          await fetch(`/api/admin/inventory/${id}`, {
            method: 'PUT',
            credentials: 'include',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ stock })
          });
        };
      });

      // Edit button
      listContainer.querySelectorAll('.edit-btn').forEach(b => {
        b.onclick = () => editProduct(prods.find(x => x.id == b.dataset.id));
      });
      // Delete button
      listContainer.querySelectorAll('.del-btn').forEach(b => {
        b.onclick = async () => {
          if (!confirm('Delete this product?')) return;
          await fetch(`/api/admin/products/${b.dataset.id}`, {
            method: 'DELETE',
            credentials: 'include'
          });
          loadProductsTable();
        };
      });
    }

    // --- Render product edit/new form ---
    function editProduct(p = {}) {
      const isNew = !p.id;
      listContainer.innerHTML = '';
      const form = document.createElement('div');
      form.className = 'admin-item card';
      form.innerHTML = `
        <h3>${isNew ? 'New' : 'Edit'} Product</h3>
        <label>Name</label>
        <input id="f-name" value="${p.name || ''}" /><br />
        <label>Category</label>
        <select id="f-cat">
          ${categories
            .map(
              c =>
                `<option value="${c.id}"${
                  c.name === p.category ? ' selected' : ''
                }>${c.name}</option>`
            )
            .join('')}
        </select><br />
        <label>Price</label>
        <input
          id="f-price"
          type="number"
          value="${p.price || 0}"
        /><br />
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

      // Populate dynamic category fields
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
        const cname = categories.find(c => c.id == form.querySelector('#f-cat').value).name;
        (categoryFields[cname] || []).forEach(fld =>
          fd.append(fld.id, form.querySelector('#' + fld.id).value)
        );

        const url = isNew ? '/api/admin/products' : `/api/admin/products/${p.id}`;
        const method = isNew ? 'POST' : 'PUT';
        const response = await fetch(url, { method, body: fd, credentials: 'include' });
        if (response.ok) alert('✅ Product saved successfully');
        else alert('❌ Error saving product');
        loadProductsTable();
      };
    }

    // Kick off initial load
    prodBtn.click();
  })();
});
