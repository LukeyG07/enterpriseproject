// db.js: PostgreSQL client setup & initial schema run
const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function init() {
  await client.connect();
  const schema = fs.readFileSync('./schema.sql').toString();
  await client.query(schema);
}

module.exports = { client, init };
