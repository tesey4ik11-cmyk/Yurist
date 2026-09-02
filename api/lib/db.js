process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const { Pool } = require('pg');

let pool = null;

function getPool() {
  if (!pool) {
    const connectionString = process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL;
    pool = new Pool({
      connectionString: connectionString || undefined,
      ssl: connectionString ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 15000,
      max: 5,
    });
  }
  return pool;
}

module.exports = { query: (...args) => getPool().query(...args), connect: () => getPool().connect() };
