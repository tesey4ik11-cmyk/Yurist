const { Pool } = require('pg');

if (!process.env.POSTGRES_URL) {
  console.error('POSTGRES_URL is not set');
}

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || 'postgresql://localhost:5432/fake',
  ssl: process.env.POSTGRES_URL ? { rejectUnauthorized: false } : false,
});

module.exports = pool;
