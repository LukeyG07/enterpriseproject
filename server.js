const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
require('dotenv').config();
const { client, init } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret',
  resave: false,
  saveUninitialized: false
}));

init().catch(err => { console.error(err); process.exit(1); });

// Auth helpers
function requireAuth(req, res, next) {
  req.session.user ? next() : res.status(401).json({ error: 'Not logged in' });
}
function requireAdmin(req, res, next) {
  req.session.user && req.session.user.is_admin
    ? next()
    : res.status(403).json({ error: 'Forbidden' });
}

// Static
app.use(express.static('./'));

// --- AUTH ---
app.post('/api/register', async (req, res) => {
  const { full_name, shipping_address, username, password } = req.body;
  if (!full_name || !shipping_address || !username || !password) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    await client.query(
      `INSERT INTO users(username,password,full_name,shipping_address)
       VALUES($1,$2,$3,$4)`,
      [username, hash, full_name, shipping_address]
    );
    // auto-login
    req.session.user = { username, is_admin: false };
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: 'Username taken' });
  }
});
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const { rows } = await client.query('SELECT * FROM users WHERE username=$1', [username]);
  if (!rows.length) return res.status(400).json({ error: 'Invalid' });
  const user = rows[0];
  if (!(await bcrypt.compare(password, user.password))) {
    return res.status(400).json({ error: 'Invalid' });
  }
  req.session.user = { id: user.id, username: user.username, is_admin: user.is_admin };
  res.json({ username: user.username, is_admin: user.is_admin });
});
app.post('/api/logout', (req, res) => { req.session.destroy(); res.json({}); });
app.get('/api/me', (req, res) => { res.json({ user: req.session.user || null }); });

// --- PUBLIC ---
app.get('/api/categories', async (req, res) => {
  const { rows } = await client.query('SELECT * FROM categories ORDER BY name');
  res.json(rows);
});
app.get('/api/products', async (req, res) => {
  const { rows } = await client.query(
    `SELECT p.*, c.name AS category, i.stock
     FROM products p
     JOIN categories c ON p.category_id=c.id
     JOIN inventory i ON p.id=i.product_id`
  );
  res.json(rows);
});

// --- CHECKOUT ---
app.post('/api/checkout', requireAuth, async (req, res) => {
  const { cart } = req.body;
  const userId = req.session.user.id;
  try {
    await client.query('BEGIN');
    let total = 0;
    for (let item of cart) {
      const { rows } = await client.query(
        'SELECT price, i.stock FROM products p JOIN inventory i ON p.id=i.product_id WHERE p.id=$1 FOR UPDATE',
        [item.productId]
      );
      if (!rows.length) throw new Error('Invalid');
      if (rows[0].stock < item.quantity) throw new Error('Out of stock');
      total += rows[0].price * item.quantity;
    }
    const { rows: orows } = await client.query(
      'INSERT INTO orders(user_id,total) VALUES($1,$2) RETURNING id',
      [userId, total]
    );
    const orderId = orows[0].id;
    for (let item of cart) {
      const { rows } = await client.query('SELECT price FROM products WHERE id=$1', [item.productId]);
      await client.query(
        'INSERT INTO order_items(order_id,product_id,quantity,price) VALUES($1,$2,$3,$4)',
        [orderId, item.productId, item.quantity, rows[0].price]
      );
      await client.query('UPDATE inventory SET stock=stock-$1 WHERE product_id=$2', [item.quantity, item.productId]);
    }
    await client.query('COMMIT');
    res.json({ success: true, orderId });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

// --- ADMIN ---
app.get('/api/admin/products', requireAdmin, async (req, res) => {
  const { rows } = await client.query(
    `SELECT p.*, c.name AS category, i.stock
     FROM products p
     JOIN categories c ON p.category_id=c.id
     JOIN inventory i ON p.id=i.product_id`
  ); res.json(rows);
});
app.post('/api/admin/products', requireAdmin, async (req, res) => {
  const fields = ['name','category_id','price','description','socket','ram_type',
    'memory_size','chipset','form_factor','capacity','wattage','efficiency',
    'case_size','fan_size','cooler_type','stock'];
  const vals = fields.map(f => req.body[f] || null);
  try {
    const q1 = `INSERT INTO products(${fields.filter(f=>'stock'!==f).join(',')}) VALUES(${fields.filter(f=>'stock'!==f).map((_,i)=>`$${i+1}`).join(',')}) RETURNING id`;
    const { rows } = await client.query(q1, vals.slice(0,-1));
    await client.query('INSERT INTO inventory(product_id,stock) VALUES($1,$2)', [rows[0].id, vals[vals.length-1]||0]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/admin/products/:id', requireAdmin, async (req, res) => {
  const id = req.params.id;
  const fields = ['name','category_id','price','description','socket','ram_type',
    'memory_size','chipset','form_factor','capacity','wattage','efficiency',
    'case_size','fan_size','cooler_type'];
  const setClause = fields.map((f,i)=>`${f}=$${i+1}`).join(',');
  const vals = fields.map(f=>req.body[f]||null).concat(id);
  try {
    await client.query(`UPDATE products SET ${setClause} WHERE id=$${fields.length+1}`, vals);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/admin/products/:id', requireAdmin, async (req, res) => {
  await client.query('DELETE FROM products WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});
app.put('/api/admin/inventory/:id', requireAdmin, async (req, res) => {
  const { stock } = req.body;
  await client.query('UPDATE inventory SET stock=$1 WHERE product_id=$2', [stock, req.params.id]);
  res.json({ success: true });
});
app.get('/api/admin/orders', requireAdmin, async (req, res) => {
  const { rows } = await client.query(
    `SELECT o.id,u.username,o.total,o.created_at
     FROM orders o LEFT JOIN users u ON u.id=o.user_id ORDER BY o.created_at DESC`
  ); res.json(rows);
});

app.listen(PORT, () => console.log(`Server on port ${PORT}`));
