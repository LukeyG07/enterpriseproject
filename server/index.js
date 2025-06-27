const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// GET all products
app.get('/api/products', (req, res) => {
  db.all('SELECT * FROM products', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// GET stock levels (admin)
app.get('/api/stock', (req, res) => {
  db.all(
    'SELECT p.id, p.name, s.quantity, s.reorder_level FROM stock s JOIN products p ON p.id = s.product_id',
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// POST feedback
app.post('/api/feedback', (req, res) => {
  const { message } = req.body;
  db.run(
    'INSERT INTO feedback(message) VALUES(?)',
    [message],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, message });
    }
  );
});

// GET feedback list
app.get('/api/feedback', (req, res) => {
  db.all('SELECT * FROM feedback ORDER BY created_at DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Start server\ nconst PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
