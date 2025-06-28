// server.js: Express API, auth, and static server
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
require('dotenv').config();

const { client, init } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret',
  resave: false,
  saveUninitialized: false
}));

// Initialize DB and default admin
init().catch(err => {
  console.error('DB init failed:', err);
  process.exit(1);
});

// Authentication middleware
function requireAuth(req, res, next) {
  if (req.session.user) next();
  else res.status(401).json({ error: 'Not authorized' });
}
function requireAdmin(req, res, next) {
  if (req.session.user && req.session.user.is_admin) next();
  else res.status(403).json({ error: 'Forbidden' });
}

// Serve static files
app.use(express.static('./'));

// --- Auth Endpoints ---
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const result = await client.query('SELECT * FROM users WHERE username=$1', [username]);
  if (result.rows.length === 0) return res.status(400).json({ error: 'Invalid credentials' });
  const user = result.rows[0];
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ error: 'Invalid credentials' });
  // Set session
  req.session.user = { id: user.id, username: user.username, is_admin: user.is_admin };
  res.json({ username: user.username, is_admin: user.is_admin });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({});
});

app.get('/api/me', (req, res) => {
  res.json({ user: req.session.user || null });
});

// --- Public API ---
app.get('/api/categories', async (req, res) => {
  const result = await client.query('SELECT * FROM categories ORDER BY name');
  res.json(result.rows);
});
app.get('/api/products', async (req, res) => {
  const result = await client.query(
    `SELECT p.* , c.name as category, i.stock
     FROM products p
     JOIN categories c ON p.category_id=c.id
     JOIN inventory i ON p.id=i.product_id`);
  res.json(result.rows);
});

// --- Checkout ---
app.post('/api/checkout', requireAuth, async (req, res) => {
  const { cart } = req.body;
  const userId = req.session.user.id;
  try {
    await client.query('BEGIN');
    let total = 0;
    for (const item of cart) {
      const prodRes = await client.query('SELECT price, i.stock FROM products p JOIN inventory i ON p.id=i.product_id WHERE p.id=$1 FOR UPDATE', [item.productId]);
      if (!prodRes.rows.length) throw new Error('Invalid product');
      const { price, stock } = prodRes.rows[0];
      if (stock < item.quantity) throw new Error('Out of stock');
      total += parseFloat(price) * item.quantity;
    }
    const orderRes = await client.query(
      'INSERT INTO orders(user_id,total) VALUES($1,$2) RETURNING id',
      [userId, total]
    );
    const orderId = orderRes.rows[0].id;
    for (const item of cart) {
      const { price } = (await client.query('SELECT price FROM products WHERE id=$1', [item.productId])).rows[0];
      await client.query(
        'INSERT INTO order_items(order_id,product_id,quantity,price) VALUES($1,$2,$3,$4)',
        [orderId, item.productId, item.quantity, price]
      );
      await client.query('UPDATE inventory SET stock=stock - $1 WHERE product_id=$2', [item.quantity, item.productId]);
    }
    await client.query('COMMIT');
    res.json({ success: true, orderId });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

// --- Admin API ---
// Products CRUD
app.get('/api/admin/products', requireAdmin, async (req, res) => {
  const result = await client.query(
    `SELECT p.*, c.name as category, i.stock
     FROM products p
     JOIN categories c ON p.category_id=c.id
     JOIN inventory i ON p.id=i.product_id`);
  res.json(result.rows);
});
app.post('/api/admin/products', requireAdmin, async (req, res) => {
  const { name, category_id, socket, ram_type, price, description, stock } = req.body;
  try {
    const prodRes = await client.query(
      `INSERT INTO products(name,category_id,socket,ram_type,price,description)
       VALUES($1,$2,$3,$4,$5,$6) RETURNING id`,
      [name, category_id, socket, ram_type, price, description]
    );
    const productId = prodRes.rows[0].id;
    await client.query(
      'INSERT INTO inventory(product_id,stock) VALUES($1,$2)',
      [productId, stock || 0]
    );
    res.json({ success: true, productId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.put('/api/admin/products/:id', requireAdmin, async (req, res) => {
  const id = req.params.id;
  const { name, category_id, socket, ram_type, price, description } = req.body;
  try {
    await client.query(
      `UPDATE products SET name=$1,category_id=$2,socket=$3,ram_type=$4,price=$5,description=$6 WHERE id=$7`,
      [name, category_id, socket, ram_type, price, description, id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.delete('/api/admin/products/:id', requireAdmin, async (req, res) => {
  const id = req.params.id;
  try {
    await client.query('DELETE FROM products WHERE id=$1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Update stock only
app.put('/api/admin/inventory/:id', requireAdmin, async (req, res) => {
  const productId = req.params.id;
  const { stock } = req.body;
  try {
    await client.query('UPDATE inventory SET stock=$1 WHERE product_id=$2', [stock, productId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Orders list
app.get('/api/admin/orders', requireAdmin, async (req, res) => {
  const orders = await client.query(
    `SELECT o.id, u.username, o.total, o.created_at
     FROM orders o
     LEFT JOIN users u ON u.id=o.user_id
     ORDER BY o.created_at DESC`
  );
  res.json(orders.rows);
});

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
