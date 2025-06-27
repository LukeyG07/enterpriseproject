const fs = require('fs');
const path = require('path');
const db = require('./db');

// Ensure data folder exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      image_url TEXT
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS stock (
      product_id INTEGER PRIMARY KEY,
      quantity INTEGER NOT NULL,
      reorder_level INTEGER NOT NULL,
      FOREIGN KEY(product_id) REFERENCES products(id)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('Database initialized.');
  process.exit(0);
});
