// app.js: minimal frontend functionality
let products = [];
let inventory = [];
let cart = [];

async function fetchProducts() {
  const res = await fetch('/api/products');
  return res.json();
}

async function fetchInventory() {
  const res = await fetch('/api/inventory');
  return res.json();
}

function updateCartCount() {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  document.getElementById('cart-count').textContent = count;
}

function renderProducts() {
  const root = document.getElementById('app');
  root.innerHTML = '';
  products.forEach(p => {
    const stockItem = inventory.find(i => i.id === p.id) || { stock: 0 };
    const prodDiv = document.createElement('div');
    prodDiv.className = 'product';
    prodDiv.innerHTML = `
      <h3>${p.name}</h3>
      <div>$${p.price.toFixed(2)}</div>
      <div>Stock: ${stockItem.stock}</div>
      <button ${stockItem.stock === 0 ? 'disabled' : ''} data-id="${p.id}">Add to Cart</button>
    `;
    prodDiv.querySelector('button').addEventListener('click', () => addToCart(p.id));
    root.appendChild(prodDiv);
  });
}

function addToCart(productId) {
  const stockItem = inventory.find(i => i.id === productId);
  if (!stockItem || stockItem.stock === 0) return;
  const existing = cart.find(i => i.productId === productId);
  if (existing) {
    if (existing.quantity < stockItem.stock) existing.quantity++;
  } else {
    cart.push({ productId, quantity: 1 });
  }
  renderCart();
  updateCartCount();
}

function renderCart() {
  const cartEl = document.getElementById('cart-items');
  cartEl.innerHTML = '';
  let total = 0;
  cart.forEach(item => {
    const prod = products.find(p => p.id === item.productId);
    const li = document.createElement('li');
    const subTotal = prod.price * item.quantity;
    total += subTotal;
    li.innerHTML = `
      <span>${prod.name} x${item.quantity}</span>
      <span>$${subTotal.toFixed(2)}</span>
      <button data-id="${item.productId}">Remove</button>
    `;
    li.querySelector('button').addEventListener('click', () => removeFromCart(item.productId));
    cartEl.appendChild(li);
  });
  document.getElementById('cart-total').textContent = total.toFixed(2);
}

function removeFromCart(productId) {
  cart = cart.filter(i => i.productId !== productId);
  renderCart();
  updateCartCount();
}

async function checkout() {
  const email = document.getElementById('checkout-email').value.trim();
  if (!email) return alert('Please enter your email');
  try {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, cart })
    });
    const data = await res.json();
    if (data.success) {
      alert('Order placed! ID: ' + data.orderId);
      cart = [];
      closeCart();
      loadData();
    } else {
      alert(data.error || 'Checkout failed');
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

function openCart() {
  document.getElementById('cart').classList.remove('hidden');
}

function closeCart() {
  document.getElementById('cart').classList.add('hidden');
}

document.getElementById('open-cart').addEventListener('click', openCart);
document.getElementById('close-cart').addEventListener('click', closeCart);
document.getElementById('checkout-btn').addEventListener('click', checkout);

async function loadData() {
  [products, inventory] = await Promise.all([fetchProducts(), fetchInventory()]);
  renderProducts();
  renderCart();
  updateCartCount();
}

loadData();
