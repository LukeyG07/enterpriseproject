// app.js: minimal frontend without build tools
async function fetchProducts() {
  const res = await fetch('/api/products');
  return res.json();
}
async function fetchInventory() {
  const res = await fetch('/api/inventory');
  return res.json();
}
function renderProducts(products, inventory) {
  const root = document.getElementById('app');
  root.innerHTML = '<h2>Catalog</h2>';
  const list = document.createElement('ul');
  products.forEach(p => {
    const stock = (inventory.find(i => i.id === p.id) || {}).stock || 0;
    const item = document.createElement('li');
    item.textContent = `${p.name} ($${p.price}) - Stock: ${stock}`;
    list.append(item);
  });
  root.append(list);
}

(async function() {
  const [products, inventory] = await Promise.all([fetchProducts(), fetchInventory()]);
  renderProducts(products, inventory);
})();
