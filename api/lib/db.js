const { Pool } = require('pg');

const connectionString = process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('No database connection string found. Set POSTGRES_URL, POSTGRES_PRISMA_URL, or DATABASE_URL.');
}

const pool = new Pool({
  connectionString: connectionString || undefined,
  ssl: connectionString ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 10000,
  max: 5,
});

module.exports = pool;
