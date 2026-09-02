const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL,
  ssl: { rejectUnauthorized: false },
});

module.exports = pool;
