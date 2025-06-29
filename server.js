// server.js
// Single-directory Express app with PostgreSQL, sessions, file uploads, and admin/public APIs

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { client, init } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.use(cors({ origin: true, credentials: true }));
app.use(bodyParser.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret',
  resave: false,
  saveUninitialized: false
}));

// Serve static files (HTML/CSS/JS) from project root
app.use(express.static(__dirname));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// --- File uploads configuration ---
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename:    (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Serve uploaded images
app.use('/uploads', express.static(uploadsDir));

// --- Initialize database and seed admin user ---
init().catch(err => {
  console.error('DB init error:', err);
  process.exit(1);
});

// --- Auth middleware ---
function requireAuth(req, res, next) {
  if (req.session.user) return next();
  res.status(401).json({ error: 'Not logged in' });
}
function requireAdmin(req, res, next) {
  if (req.session.user && req.session.user.is_admin) return next();
  res.status(403).json({ error: 'Forbidden' });
}

// --- AUTH ROUTES ---

// Register new user
app.post('/api/register', async (req, res) => {
  const { full_name, shipping_address, username, password } = req.body;
  if (!full_name || !shipping_address || !username || !password) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await client.query(
      'INSERT INTO users(username,password,full_name,shipping_address) VALUES($1,$2,$3,$4) RETURNING id',
      [username, hash, full_name, shipping_address]
    );
    // Store new user in session
    req.session.user = { id: rows[0].id, username, is_admin: false };
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: 'Username taken' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const { rows } = await client.query('SELECT * FROM users WHERE username=$1', [username]);
  if (!rows.length) {
    return res.status(400).json({ error: 'Invalid credentials' });
  }
  const user = rows[0];
  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.status(400).json({ error: 'Invalid credentials' });
  }
  req.session.user = { id: user.id, username: user.username, is_admin: user.is_admin };
  res.json({ username: user.username, is_admin: user.is_admin });
});

// Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({});
});

// Get current user
app.get('/api/me', (req, res) => {
  res.json({ user: req.session.user || null });
});

// --- PUBLIC API ---

// Get all categories
app.get('/api/categories', async (req, res) => {
  const { rows } = await client.query('SELECT * FROM categories ORDER BY name');
  res.json(rows);
});

// Get all products (LEFT JOIN inventory so even new products without stock row show)
app.get('/api/products', async (req, res) => {
  const { rows } = await client.query(`
    SELECT
      p.*,
      c.name AS category,
      COALESCE(i.stock, 0) AS stock
    FROM products p
    JOIN categories c ON p.category_id = c.id
    LEFT JOIN inventory i ON p.id = i.product_id
    ORDER BY p.id
  `);
  res.json(rows);
});

// Get single product by ID
app.get('/api/products/:id', async (req, res) => {
  const { rows } = await client.query(`
    SELECT
      p.*,
      c.name AS category,
      COALESCE(i.stock, 0) AS stock
    FROM products p
    JOIN categories c ON p.category_id = c.id
    LEFT JOIN inventory i ON p.id = i.product_id
    WHERE p.id = $1
  `, [req.params.id]);
  if (!rows.length) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.json(rows[0]);
});

// --- CHECKOUT ---

app.post('/api/checkout', requireAuth, async (req, res) => {
  const { cart } = req.body;
  const userId = req.session.user.id;

  try {
    await client.query('BEGIN');

    // Verify stock and calculate total
    let total = 0;
    for (const item of cart) {
      const { rows } = await client.query(
        `SELECT p.price, i.stock
         FROM products p
         JOIN inventory i ON p.id = i.product_id
         WHERE p.id = $1
         FOR UPDATE`,
        [item.productId]
      );
      if (!rows.length || rows[0].stock < item.quantity) {
        throw new Error('Out of stock');
      }
      total += rows[0].price * item.quantity;
    }

    // Create order
    const { rows: orderRows } = await client.query(
      'INSERT INTO orders(user_id, total) VALUES($1, $2) RETURNING id',
      [userId, total]
    );
    const orderId = orderRows[0].id;

    // Insert order_items and decrement inventory
    for (const item of cart) {
      const { rows } = await client.query(
        'SELECT price FROM products WHERE id = $1', [item.productId]
      );
      const price = rows[0].price;
      await client.query(
        'INSERT INTO order_items(order_id, product_id, quantity, price) VALUES($1, $2, $3, $4)',
        [orderId, item.productId, item.quantity, price]
      );
      await client.query(
        'UPDATE inventory SET stock = stock - $1 WHERE product_id = $2',
        [item.quantity, item.productId]
      );
    }

    await client.query('COMMIT');
    res.json({ success: true, orderId });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

// --- ADMIN API ---

// Get all products for admin
app.get('/api/admin/products', requireAdmin, async (req, res) => {
  const { rows } = await client.query(`
    SELECT
      p.*,
      c.name AS category,
      COALESCE(i.stock, 0) AS stock
    FROM products p
    JOIN categories c ON p.category_id = c.id
    LEFT JOIN inventory i ON p.id = i.product_id
    ORDER BY p.id
  `);
  res.json(rows);
});

// Create new product
app.post('/api/admin/products', requireAdmin, upload.single('image'), async (req, res) => {
  const data = req.body;
  const imgUrl = req.file ? '/uploads/' + req.file.filename : null;

  try {
    const { rows } = await client.query(`
      INSERT INTO products(
        name, category_id, price, description, image_url,
        socket, ram_type, memory_size, chipset, form_factor,
        capacity, wattage, efficiency, case_size, fan_size, cooler_type
      ) VALUES (
        $1,$2,$3,$4,$5,
        $6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,$16
      ) RETURNING id
    `, [
      data.name, data.category_id, data.price, data.description, imgUrl,
      data.socket || null,
      data.ram_type || null,
      data.memory_size || null,
      data.chipset || null,
      data.form_factor || null,
      data.capacity || null,
      data.wattage || null,
      data.efficiency || null,
      data.case_size || null,
      data.fan_size || null,
      data.cooler_type || null
    ]);

    const newId = rows[0].id;
    // Insert inventory row (default 0 if missing)
    await client.query(
      'INSERT INTO inventory(product_id, stock) VALUES($1, $2)',
      [newId, data.stock || 0]
    );

    res.json({ success: true, id: newId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update existing product
app.put('/api/admin/products/:id', requireAdmin, upload.single('image'), async (req, res) => {
  const id = req.params.id;
  const data = req.body;

  try {
    await client.query(`
      UPDATE products SET
        name=$1, category_id=$2, price=$3, description=$4,
        socket=$5, ram_type=$6, memory_size=$7, chipset=$8,
        form_factor=$9, capacity=$10, wattage=$11, efficiency=$12,
        case_size=$13, fan_size=$14, cooler_type=$15
      WHERE id=$16
    `, [
      data.name, data.category_id, data.price, data.description,
      data.socket || null,
      data.ram_type || null,
      data.memory_size || null,
      data.chipset || null,
      data.form_factor || null,
      data.capacity || null,
      data.wattage || null,
      data.efficiency || null,
      data.case_size || null,
      data.fan_size || null,
      data.cooler_type || null,
      id
    ]);

    if (req.file) {
      const imgUrl = '/uploads/' + req.file.filename;
      await client.query(
        'UPDATE products SET image_url=$1 WHERE id=$2',
        [imgUrl, id]
      );
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete product
app.delete('/api/admin/products/:id', requireAdmin, async (req, res) => {
  await client.query('DELETE FROM products WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

// Update inventory (stock) only
app.put('/api/admin/inventory/:id', requireAdmin, async (req, res) => {
  const { stock } = req.body;
  await client.query(
    'UPDATE inventory SET stock=$1 WHERE product_id = $2',
    [stock, req.params.id]
  );
  res.json({ success: true });
});

// Get all orders for admin
app.get('/api/admin/orders', requireAdmin, async (req, res) => {
  const { rows } = await client.query(`
    SELECT o.id, u.username, o.total, o.created_at
    FROM orders o
    LEFT JOIN users u ON u.id = o.user_id
    ORDER BY o.created_at DESC
  `);
  res.json(rows);
});

// --- Start server ---
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
