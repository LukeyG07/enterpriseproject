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
  await client.query(fs.readFileSync('./schema.sql').toString());
  // Seed admin
  const { rows } = await client.query("SELECT id FROM users WHERE username='admin'");
  if (!rows.length) {
    const hash = await bcrypt.hash('password', 10);
    await client.query(
      'INSERT INTO users(username,password,full_name,shipping_address,is_admin) VALUES($1,$2,$3,$4,$5)',
      ['admin', hash, 'Administrator', 'HQ', true]
    );
    console.log('Admin user created (admin/password)');
  }
}

module.exports = { client, init };
