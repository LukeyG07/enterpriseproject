// server.js: Express API & static server
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const { client, init } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// Initialize DB
init().catch(err => {
  console.error('DB init failed:', err);
  process.exit(1);
});

// Serve static files from root
app.use(express.static('./'));

// --- API Endpoints ---

// List all products
app.get('/api/products', async (req, res) => {
  const result = await client.query('SELECT * FROM products');
  res.json(result.rows);
});

// Get inventory
app.get('/api/inventory', async (req, res) => {
  const result = await client.query(
    `SELECT p.id, p.name, i.stock FROM products p JOIN inventory i ON p.id = i.product_id`
  );
  res.json(result.rows);
});

// Build configurator compatibility check
app.post('/api/configurator', async (req, res) => {
  const { cpuId, mbId, ramId } = req.body;
  const q = 'SELECT id, name, type, socket, ram_type FROM products WHERE id = ANY($1)';
  const vals = [[cpuId, mbId, ramId]];
  const result = await client.query(q, vals);
  const items = result.rows.reduce((acc, row) => { acc[row.type] = row; return acc; }, {});

  const cpu = items['CPU'], mb = items['Motherboard'], ram = items['RAM'];
  if (!cpu || !mb || !ram) return res.status(400).json({ error: 'Invalid component IDs' });

  const socketOk = cpu.socket === mb.socket;
  const ramOk = ram.ram_type === mb.ram_type;
  const compatible = socketOk && ramOk;
  const message = compatible ? 'Components compatible' : 'Compatibility error';
  res.json({ compatible, message });
});

// Checkout flow
app.post('/api/checkout', async (req, res) => {
  const { email, cart } = req.body;
  try {
    await client.query('BEGIN');
    // Find or create user
    let result = await client.query('SELECT id FROM users WHERE email=$1', [email]);
    let userId;
    if (result.rows.length) userId = result.rows[0].id;
    else {
      result = await client.query('INSERT INTO users(email) VALUES($1) RETURNING id', [email]);
      userId = result.rows[0].id;
    }
    // Calculate total and check stock
    let total = 0;
    for (const item of cart) {
      const prod = (await client.query('SELECT price FROM products WHERE id=$1', [item.productId])).rows[0];
      const inv = (await client.query('SELECT stock FROM inventory WHERE product_id=$1 FOR UPDATE', [item.productId])).rows[0];
      if (inv.stock < item.quantity) throw new Error('Out of stock');
      total += parseFloat(prod.price) * item.quantity;
    }
    // Create order
    result = await client.query(
      'INSERT INTO orders(user_id, total) VALUES($1,$2) RETURNING id',
      [userId, total]
    );
    const orderId = result.rows[0].id;
    // Insert items & update inventory
    for (const item of cart) {
      const prod = (await client.query('SELECT price FROM products WHERE id=$1', [item.productId])).rows[0];
      await client.query(
        'INSERT INTO order_items(order_id, product_id, quantity, price) VALUES($1,$2,$3,$4)',
        [orderId, item.productId, item.quantity, prod.price]
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

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
