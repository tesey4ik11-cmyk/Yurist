process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = require('../lib/db');
const { authenticate } = require('../lib/auth');
const { json, err, sanitizeObj } = require('../lib/helpers');
const { seedDatabase } = require('../lib/seed');

const crudTables = {
  services: { cols: ['title', 'description', 'icon', 'price', 'button_text', 'sort_order', 'active'] },
  advantages: { cols: ['title', 'description', 'icon', 'sort_order', 'active'] },
  steps: { cols: ['number', 'title', 'description', 'sort_order', 'active'] },
  cases: { cols: ['title', 'situation', 'problem', 'solution', 'result', 'image_url', 'date', 'is_demo', 'active'] },
  reviews: { cols: ['author_name', 'city', 'text', 'rating', 'date', 'photo_url', 'published', 'is_demo'] },
  faq: { cols: ['question', 'answer', 'sort_order', 'active'] },
};

async function ensureDb() {
  const check = await pool.query("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='settings')");
  if (check.rows[0].exists) return;
  const fs = require('fs');
  const path = require('path');
  const schemaPath = path.join(process.cwd(), 'database', 'schema-postgres.sql');
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schema);
  }
  await seedDatabase();
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    return res.status(204).end();
  }

  try {
    const user = authenticate(req);
    if (!user) return err(res, 'Не авторизован', 401);

    await ensureDb();

    const url = new URL(req.url, 'http://localhost');
    const fullPath = url.pathname.replace(/^\/api\/admin\//, '').replace(/^\/+|\/+$/g, '');

    // /api/admin/me
    if (fullPath === 'me' && req.method === 'GET') {
      return json(res, { email: user.email });
    }

    // /api/admin/dashboard
    if (fullPath === 'dashboard' && req.method === 'GET') {
      const inquiries = (await pool.query('SELECT COUNT(*) as c FROM inquiries')).rows[0];
      const newInquiries = (await pool.query("SELECT COUNT(*) as c FROM inquiries WHERE status='new'")).rows[0];
      const services = (await pool.query('SELECT COUNT(*) as c FROM services')).rows[0];
      const reviews = (await pool.query('SELECT COUNT(*) as c FROM reviews')).rows[0];
      const recentInquiries = (await pool.query('SELECT * FROM inquiries ORDER BY created_at DESC LIMIT 10')).rows;
      return json(res, {
        stats: { total_inquiries: parseInt(inquiries.c), new_inquiries: parseInt(newInquiries.c), services: parseInt(services.c), reviews: parseInt(reviews.c) },
        recent_inquiries: recentInquiries,
      });
    }

    // Settings
    if (fullPath === 'settings' && req.method === 'GET') {
      const rows = await pool.query('SELECT key, value FROM settings');
      const settings = {};
      for (const row of rows.rows) settings[row.key] = row.value;
      return json(res, settings);
    }
    if (fullPath === 'settings' && req.method === 'PUT') {
      const body = await getBody(req);
      const sanitized = sanitizeObj(body);
      for (const [key, value] of Object.entries(sanitized)) {
        await pool.query('INSERT INTO settings (key, value, updated_at) VALUES ($1,$2,NOW()) ON CONFLICT (key) DO UPDATE SET value=$2, updated_at=NOW()', [key, String(value)]);
      }
      return json(res, { ok: true });
    }

    // Expert
    if (fullPath === 'expert' && req.method === 'GET') {
      const row = (await pool.query('SELECT * FROM expert LIMIT 1')).rows[0] || {};
      return json(res, row);
    }
    if (fullPath === 'expert' && req.method === 'PUT') {
      const body = await getBody(req);
      const sanitized = sanitizeObj(body);
      const existing = (await pool.query('SELECT id FROM expert LIMIT 1')).rows[0];
      if (existing) {
        const sets = Object.keys(sanitized).map((k, i) => `${k}=$${i + 1}`).join(', ');
        const vals = Object.values(sanitized);
        await pool.query(`UPDATE expert SET ${sets}, updated_at=NOW() WHERE id=$${vals.length + 1}`, [...vals, existing.id]);
      } else {
        const cols = Object.keys(sanitized);
        const vals = Object.values(sanitized);
        const ph = cols.map((_, i) => `$${i + 1}`).join(', ');
        await pool.query(`INSERT INTO expert (${cols.join(',')}) VALUES (${ph})`, vals);
      }
      return json(res, { ok: true });
    }

    // Contacts
    if (fullPath === 'contacts' && req.method === 'GET') {
      const row = (await pool.query('SELECT * FROM contacts LIMIT 1')).rows[0] || {};
      return json(res, row);
    }
    if (fullPath === 'contacts' && req.method === 'PUT') {
      const body = await getBody(req);
      const sanitized = sanitizeObj(body);
      const existing = (await pool.query('SELECT id FROM contacts LIMIT 1')).rows[0];
      if (existing) {
        const sets = Object.keys(sanitized).map((k, i) => `${k}=$${i + 1}`).join(', ');
        const vals = Object.values(sanitized);
        await pool.query(`UPDATE contacts SET ${sets}, updated_at=NOW() WHERE id=$${vals.length + 1}`, [...vals, existing.id]);
      } else {
        const cols = Object.keys(sanitized);
        const vals = Object.values(sanitized);
        const ph = cols.map((_, i) => `$${i + 1}`).join(', ');
        await pool.query(`INSERT INTO contacts (${cols.join(',')}) VALUES (${ph})`, vals);
      }
      return json(res, { ok: true });
    }

    // SEO
    if (fullPath === 'seo' && req.method === 'GET') {
      const row = (await pool.query("SELECT * FROM seo WHERE page='home' LIMIT 1")).rows[0] || {};
      return json(res, row);
    }
    if (fullPath === 'seo' && req.method === 'PUT') {
      const body = await getBody(req);
      const sanitized = sanitizeObj(body);
      const existing = (await pool.query("SELECT id FROM seo WHERE page='home' LIMIT 1")).rows[0];
      if (existing) {
        const sets = Object.keys(sanitized).map((k, i) => `${k}=$${i + 1}`).join(', ');
        const vals = Object.values(sanitized);
        await pool.query(`UPDATE seo SET ${sets}, updated_at=NOW() WHERE id=$${vals.length + 1}`, [...vals, existing.id]);
      } else {
        const cols = ['page', ...Object.keys(sanitized)];
        const vals = ['home', ...Object.values(sanitized)];
        const ph = cols.map((_, i) => `$${i + 1}`).join(', ');
        await pool.query(`INSERT INTO seo (${cols.join(',')}) VALUES (${ph})`, vals);
      }
      return json(res, { ok: true });
    }

    // Inquiries
    if (fullPath === 'inquiries' && req.method === 'GET') {
      const rows = await pool.query('SELECT * FROM inquiries ORDER BY created_at DESC');
      return json(res, rows.rows);
    }
    const inqMatch = fullPath.match(/^inquiries\/(\d+)$/);
    if (inqMatch) {
      const id = parseInt(inqMatch[1]);
      if (req.method === 'PUT') {
        const body = await getBody(req);
        const sanitized = sanitizeObj(body);
        const sets = Object.keys(sanitized).map((k, i) => `${k}=$${i + 1}`).join(', ');
        const vals = Object.values(sanitized);
        await pool.query(`UPDATE inquiries SET ${sets}, updated_at=NOW() WHERE id=$${vals.length + 1}`, [...vals, id]);
        return json(res, { ok: true });
      }
      if (req.method === 'DELETE') {
        await pool.query('DELETE FROM inquiries WHERE id=$1', [id]);
        return json(res, { ok: true });
      }
    }

    // Generic CRUD
    for (const [table, config] of Object.entries(crudTables)) {
      if (fullPath === table && req.method === 'GET') {
        const rows = await pool.query(`SELECT * FROM ${table} ORDER BY sort_order ASC, id DESC`);
        return json(res, rows.rows);
      }
      if (fullPath === table && req.method === 'POST') {
        const body = await getBody(req);
        const sanitized = sanitizeObj(body);
        const cols = Object.keys(sanitized).filter(k => config.cols.includes(k));
        const vals = cols.map(k => sanitized[k]);
        const ph = cols.map((_, i) => `$${i + 1}`).join(', ');
        const result = await pool.query(`INSERT INTO ${table} (${cols.join(',')}) VALUES (${ph}) RETURNING id`, vals);
        return json(res, { ok: true, id: result.rows[0].id }, 201);
      }
      const idMatch = fullPath.match(new RegExp(`^${table}\\/(\\d+)$`));
      if (idMatch) {
        const id = parseInt(idMatch[1]);
        if (req.method === 'GET') {
          const row = (await pool.query(`SELECT * FROM ${table} WHERE id=$1`, [id])).rows[0];
          return row ? json(res, row) : err(res, 'Not found', 404);
        }
        if (req.method === 'PUT') {
          const body = await getBody(req);
          const sanitized = sanitizeObj(body);
          const cols = Object.keys(sanitized).filter(k => config.cols.includes(k));
          const vals = cols.map(k => sanitized[k]);
          const sets = cols.map((k, i) => `${k}=$${i + 1}`).join(', ');
          await pool.query(`UPDATE ${table} SET ${sets}, updated_at=NOW() WHERE id=$${vals.length + 1}`, [...vals, id]);
          return json(res, { ok: true });
        }
        if (req.method === 'DELETE') {
          await pool.query(`DELETE FROM ${table} WHERE id=$1`, [id]);
          return json(res, { ok: true });
        }
      }
    }

    return err(res, 'Not found', 404);
  } catch (e) {
    return json(res, { error: e.message }, 500);
  }
};

async function getBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => { try { resolve(JSON.parse(body)); } catch { resolve({}); } });
  });
}
