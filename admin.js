// public/admin.js
// Renders a compact table with inline stock editing + full Edit/Delete actions

const apiJson = (path, opts = {}) =>
  fetch(path, { credentials: 'include', ...opts }).then(r => r.json());

(async () => {
  // Ensure admin
  const { user } = await apiJson('/api/me');
  if (!user || !user.is_admin) {
    alert('Access denied');
    return (window.location = '/');
  }

  // DOM refs
  const btnHome = document.getElementById('btn-home');
  const btnLogout = document.getElementById('btn-logout-admin');
  const prodBtn = document.getElementById('admin-products');
  const orderBtn = document.getElementById('admin-orders');
  const prodSec = document.getElementById('admin-products-section');
  const orderSec = document.getElementById('admin-orders-section');

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
    document.getElementById('orders-list').innerHTML = ords
      .map(o => `<li>Order #${o.id} by ${o.username||'Guest'} – $${o.total.toFixed(2)} on ${new Date(o.created_at).toLocaleString()}</li>`)
      .join('');
  };

  async function loadProductsTable() {
    // Fetch
    const prods = await apiJson('/api/admin/products');
    // Build table
    prodSec.innerHTML = `
      <table id="admin-products-table" class="table">
        <thead>
          <tr>
            <th>ID</th><th>Name</th><th>Category</th><th>Price</th>
            <th>Stock</th><th>Actions</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>`;
    const tbody = prodSec.querySelector('tbody');

    prods.forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${p.id}</td>
        <td>${p.name}</td>
        <td>${p.category}</td>
        <td>$${p.price.toFixed(2)}</td>
        <td>
          <input type="number" class="stock-input" data-id="${p.id}" value="${p.stock}" style="width:60px" />
        </td>
        <td>
          <button class="edit-btn" data-id="${p.id}">Edit</button>
          <button class="del-btn" data-id="${p.id}">Delete</button>
        </td>`;
      tbody.appendChild(tr);
    });

    // Inline stock save
    tbody.querySelectorAll('.stock-input').forEach(input => {
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

    // Edit/Delete handlers (you can re-use your existing editProduct())
    tbody.querySelectorAll('.edit-btn').forEach(b => {
      b.onclick = () => editProduct(prods.find(x => x.id == b.dataset.id));
    });
    tbody.querySelectorAll('.del-btn').forEach(b => {
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

  // Placeholder for your existing editProduct(form) logic
  function editProduct(product) {
    //… your edit form builder here …
  }

  // Initial load
  prodBtn.click();
})();
