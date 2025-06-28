// db.js: PostgreSQL client setup & initial schema run
const { Client } = require('pg');
const fs = require('fs');
const bcrypt = require('bcrypt');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function init() {
  await client.connect();
  const schema = fs.readFileSync('./schema.sql').toString();
  await client.query(schema);

  // Create default admin user if not exists
  const res = await client.query("SELECT id FROM users WHERE username='admin'");
  if (res.rows.length === 0) {
    const hash = await bcrypt.hash('password', 10);
    await client.query(
      'INSERT INTO users(username,password,is_admin) VALUES($1,$2,$3)',
      ['admin', hash, true]
    );
    console.log('Default admin user created: admin / password');
  }
}

module.exports = { client, init };
