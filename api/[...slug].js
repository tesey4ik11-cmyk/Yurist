process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = require('./lib/db');
const { json, err, sanitize } = require('./lib/helpers');
const { seedDatabase } = require('./lib/seed');
const fs = require('fs');
const path = require('path');

async function ensureDb() {
  const check = await pool.query("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='settings')");
  if (check.rows[0].exists) return;
  const schemaPath = path.join(process.cwd(), 'database', 'schema-postgres.sql');
  if (fs.existsSync(schemaPath)) await pool.query(fs.readFileSync(schemaPath, 'utf8'));
  await seedDatabase();
}

async function getBody(req) {
  if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) return req.body;
  try { return await req.json(); } catch {}
  try { return await req.text().then(t => JSON.parse(t)); } catch {}
  return {};
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    return res.status(204).end();
  }

  try {
    const url = new URL(req.url, 'http://localhost');
    const rawPath = url.pathname.replace(/^\/api\//, '').replace(/^\/+|\/+$/g, '');

    await ensureDb();

    if (rawPath === 'site' && req.method === 'GET') {
      const settingsRows = await pool.query('SELECT key, value FROM settings');
      const settings = {};
      for (const row of settingsRows.rows) settings[row.key] = row.value;
      const expert = (await pool.query('SELECT * FROM expert LIMIT 1')).rows[0] || {};
      const contacts = (await pool.query('SELECT * FROM contacts LIMIT 1')).rows[0] || {};
      const seo = (await pool.query("SELECT * FROM seo WHERE page='home' LIMIT 1")).rows[0] || {};
      return json(res, { settings, expert, contacts, seo });
    }

    const publicRoutes = {
      services: 'SELECT * FROM services WHERE active=1 ORDER BY sort_order ASC',
      advantages: 'SELECT * FROM advantages WHERE active=1 ORDER BY sort_order ASC',
      steps: 'SELECT * FROM steps WHERE active=1 ORDER BY sort_order ASC',
      cases: 'SELECT * FROM cases WHERE active=1 ORDER BY id DESC',
      reviews: 'SELECT * FROM reviews WHERE published=1 ORDER BY id DESC',
      faq: 'SELECT * FROM faq WHERE active=1 ORDER BY sort_order ASC',
    };
    if (publicRoutes[rawPath] && req.method === 'GET') {
      const rows = await pool.query(publicRoutes[rawPath]);
      return json(res, rows.rows);
    }

    if (rawPath === 'contacts' && req.method === 'GET') {
      const row = (await pool.query('SELECT * FROM contacts LIMIT 1')).rows[0] || {};
      return json(res, row);
    }

    if (rawPath === 'inquiries' && req.method === 'POST') {
      const body = await getBody(req);
      const name = sanitize(body.name || '');
      const phone = sanitize(body.phone || '');
      const contact_method = sanitize(body.contact_method || '');
      const message = sanitize(body.message || '');
      if (!name || !phone) return err(res, 'Имя и телефон обязательны');
      await pool.query('INSERT INTO inquiries (name, phone, contact_method, message) VALUES ($1,$2,$3,$4)', [name, phone, contact_method, message]);
      return json(res, { ok: true, message: 'Заявка отправлена' }, 201);
    }

    return err(res, 'Not found', 404);
  } catch (e) {
    return json(res, { error: e.message }, 500);
  }
};
