// server.js
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

// allow CORS with cookies
app.use(cors({ origin: true, credentials: true }));
app.use(bodyParser.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret',
  resave: false,
  saveUninitialized: false
}));

// static files
app.use(express.static(__dirname));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// uploads setup
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename:    (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });
app.use('/uploads', express.static(uploadsDir));

// init DB + seed admin
init().catch(err => {
  console.error('DB init error:', err);
  process.exit(1);
});

// auth middleware
function requireAuth(req, res, next) {
  if (req.session.user) return next();
  res.status(401).json({ error: 'Not logged in' });
}
function requireAdmin(req, res, next) {
  if (req.session.user && req.session.user.is_admin) return next();
  res.status(403).json({ error: 'Forbidden' });
}

// --- AUTH ---
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
    req.session.user = { id: rows[0].id, username, is_admin: false };
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: 'Username taken' });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const { rows } = await client.query(
    'SELECT * FROM users WHERE username=$1', [username]
  );
  if (!rows.length || !(await bcrypt.compare(password, rows[0].password))) {
    return res.status(400).json({ error: 'Invalid credentials' });
  }
  const u = rows[0];
  req.session.user = { id: u.id, username: u.username, is_admin: u.is_admin };
  res.json({ username: u.username, is_admin: u.is_admin });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({});
});

app.get('/api/me', (req, res) => {
  res.json({ user: req.session.user || null });
});

// --- PUBLIC API ---
// categories unchanged
app.get('/api/categories', async (req, res) => {
  const { rows } = await client.query('SELECT * FROM categories ORDER BY name');
  res.json(rows);
});

// products: LEFT JOIN so every product shows
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

// single‐product endpoint (for detail views if you add one)
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
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

// (rest of your checkout & admin routes remain the same)
// …


app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
