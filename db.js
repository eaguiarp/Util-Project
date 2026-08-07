require('dns').setDefaultResultOrder('ipv4first');
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // necessário pra conexão externa com Railway
});

module.exports = pool;