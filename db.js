const { Client } = require('pg');
const fs = require('fs');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Configure PostgreSQL client
theClient = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function init() {
  // Connect to the database
  await theClient.connect();

  // Only run schema if categories table doesn't exist
  const { rows } = await theClient.query(
    "SELECT EXISTS (SELECT 1 FROM pg_tables WHERE tablename='categories')"
  );

  if (!rows[0].exists) {
    // Initialize schema
    const schema = fs.readFileSync('./schema.sql', 'utf-8');
    await theClient.query(schema);
    console.log('Database schema initialized');
  } else {
    console.log('Database schema already exists, skipping initialization');
  }

  // Seed default admin user if not present
  const res = await theClient.query(
    "SELECT id FROM users WHERE username='admin'"
  );
  if (!res.rows.length) {
    const hash = await bcrypt.hash('password', 10);
    await theClient.query(
      'INSERT INTO users(username,password,full_name,shipping_address,is_admin) VALUES($1,$2,$3,$4,$5)',
      ['admin', hash, 'Administrator', 'Head Office Address', true]
    );
    console.log('Admin user created: admin / password');
  }
}

module.exports = { client: theClient, init };
