const pool = require('./lib/db');
const { authenticate, hashPassword, createToken } = require('./lib/auth');
const { json, err, sanitize, sanitizeObj } = require('./lib/helpers');
const { seedDatabase } = require('./lib/seed');

const crudTables = {
  services: { cols: ['title', 'description', 'icon', 'price', 'button_text', 'sort_order', 'active'] },
  advantages: { cols: ['title', 'description', 'icon', 'sort_order', 'active'] },
  steps: { cols: ['number', 'title', 'description', 'sort_order', 'active'] },
  cases: { cols: ['title', 'situation', 'problem', 'solution', 'result', 'image_url', 'date', 'is_demo', 'active'] },
  reviews: { cols: ['author_name', 'city', 'text', 'rating', 'date', 'photo_url', 'published', 'is_demo'] },
  faq: { cols: ['question', 'answer', 'sort_order', 'active'] },
};

const loginAttempts = new Map();

async function ensureDb() {
  const check = await pool.query("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='settings')");
  if (!check.rows[0].exists) {
    const fs = require('fs');
    const path = require('path');
    const schemaPath = path.join(process.cwd(), 'database', 'schema-postgres.sql');
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      await pool.query(schema);
    }
    await seedDatabase();
  }
}

module.exports = async function handler(req) {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' } });
    }

    const url = new URL(req.url);
    let apiPath = url.pathname.replace(/^\/api\//, '').replace(/^\/+|\/+$/g, '');

    await ensureDb();

    // ============ PUBLIC API ============
    if (apiPath === 'site' && req.method === 'GET') {
      const settingsRows = await pool.query('SELECT key, value FROM settings');
      const settings = {};
      for (const row of settingsRows.rows) settings[row.key] = row.value;
      const expert = (await pool.query('SELECT * FROM expert LIMIT 1')).rows[0] || {};
      const contacts = (await pool.query('SELECT * FROM contacts LIMIT 1')).rows[0] || {};
      const seo = (await pool.query("SELECT * FROM seo WHERE page='home' LIMIT 1")).rows[0] || {};
      return json({ settings, expert, contacts, seo });
    }

    const publicRoutes = {
      services: 'SELECT * FROM services WHERE active=1 ORDER BY sort_order ASC',
      advantages: 'SELECT * FROM advantages WHERE active=1 ORDER BY sort_order ASC',
      steps: 'SELECT * FROM steps WHERE active=1 ORDER BY sort_order ASC',
      cases: 'SELECT * FROM cases WHERE active=1 ORDER BY id DESC',
      reviews: 'SELECT * FROM reviews WHERE published=1 ORDER BY id DESC',
      faq: 'SELECT * FROM faq WHERE active=1 ORDER BY sort_order ASC',
    };
    if (publicRoutes[apiPath] && req.method === 'GET') {
      const rows = await pool.query(publicRoutes[apiPath]);
      return json(rows.rows);
    }

    if (apiPath === 'contacts' && req.method === 'GET') {
      const row = (await pool.query('SELECT * FROM contacts LIMIT 1')).rows[0] || {};
      return json(row);
    }

    if (apiPath === 'inquiries' && req.method === 'POST') {
      const body = await req.json();
      const name = sanitize(body.name || '');
      const phone = sanitize(body.phone || '');
      const contact_method = sanitize(body.contact_method || '');
      const message = sanitize(body.message || '');
      if (!name || !phone) return err('Имя и телефон обязательны');
      await pool.query('INSERT INTO inquiries (name, phone, contact_method, message) VALUES ($1,$2,$3,$4)', [name, phone, contact_method, message]);
      return json({ ok: true, message: 'Заявка отправлена' }, 201);
    }

    // ============ ADMIN LOGIN ============
    if (apiPath === 'admin/login' && req.method === 'POST') {
      const ip = req.headers['x-forwarded-for'] || 'unknown';
      const now = Date.now();
      const attempts = loginAttempts.get(ip) || [];
      const recent = attempts.filter(t => now - t < 60000);
      if (recent.length >= 5) return err('Слишком много попыток.', 429);
      recent.push(now);
      loginAttempts.set(ip, recent);

      const body = await req.json();
      const { email, password } = body;
      if (!email || !password) return err('Введите email и пароль');
      const hash = hashPassword(password);
      if (email !== process.env.ADMIN_EMAIL || hash !== process.env.ADMIN_PASSWORD_HASH) {
        return err('Неверный email или пароль', 401);
      }
      const token = createToken(email, process.env.JWT_SECRET);
      return json({ token, email });
    }

    // All admin routes below require auth
    if (!apiPath.startsWith('admin/')) return err('Not found', 404);

    const user = authenticate(req);
    if (!user) return err('Не авторизован', 401);

    const adminPart = apiPath.replace('admin/', '');

    if (adminPart === 'me' && req.method === 'GET') {
      return json({ email: user.email });
    }

    if (adminPart === 'dashboard' && req.method === 'GET') {
      const inquiries = (await pool.query('SELECT COUNT(*) as c FROM inquiries')).rows[0];
      const newInquiries = (await pool.query("SELECT COUNT(*) as c FROM inquiries WHERE status='new'")).rows[0];
      const services = (await pool.query('SELECT COUNT(*) as c FROM services')).rows[0];
      const reviews = (await pool.query('SELECT COUNT(*) as c FROM reviews')).rows[0];
      const recentInquiries = (await pool.query('SELECT * FROM inquiries ORDER BY created_at DESC LIMIT 10')).rows;
      return json({
        stats: { total_inquiries: parseInt(inquiries.c), new_inquiries: parseInt(newInquiries.c), services: parseInt(services.c), reviews: parseInt(reviews.c) },
        recent_inquiries: recentInquiries,
      });
    }

    if (adminPart === 'settings' && req.method === 'GET') {
      const rows = await pool.query('SELECT key, value FROM settings');
      const settings = {};
      for (const row of rows.rows) settings[row.key] = row.value;
      return json(settings);
    }
    if (adminPart === 'settings' && req.method === 'PUT') {
      const body = await req.json();
      const sanitized = sanitizeObj(body);
      for (const [key, value] of Object.entries(sanitized)) {
        await pool.query('INSERT INTO settings (key, value, updated_at) VALUES ($1,$2,NOW()) ON CONFLICT (key) DO UPDATE SET value=$2, updated_at=NOW()', [key, String(value)]);
      }
      return json({ ok: true });
    }

    if (adminPart === 'expert' && req.method === 'GET') {
      const row = (await pool.query('SELECT * FROM expert LIMIT 1')).rows[0] || {};
      return json(row);
    }
    if (adminPart === 'expert' && req.method === 'PUT') {
      const body = await req.json();
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
      return json({ ok: true });
    }

    if (adminPart === 'contacts' && req.method === 'GET') {
      const row = (await pool.query('SELECT * FROM contacts LIMIT 1')).rows[0] || {};
      return json(row);
    }
    if (adminPart === 'contacts' && req.method === 'PUT') {
      const body = await req.json();
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
      return json({ ok: true });
    }

    if (adminPart === 'seo' && req.method === 'GET') {
      const row = (await pool.query("SELECT * FROM seo WHERE page='home' LIMIT 1")).rows[0] || {};
      return json(row);
    }
    if (adminPart === 'seo' && req.method === 'PUT') {
      const body = await req.json();
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
      return json({ ok: true });
    }

    if (adminPart === 'inquiries' && req.method === 'GET') {
      const rows = await pool.query('SELECT * FROM inquiries ORDER BY created_at DESC');
      return json(rows.rows);
    }
    const inqMatch = adminPart.match(/^inquiries\/(\d+)$/);
    if (inqMatch) {
      const id = parseInt(inqMatch[1]);
      if (req.method === 'PUT') {
        const body = await req.json();
        const sanitized = sanitizeObj(body);
        const sets = Object.keys(sanitized).map((k, i) => `${k}=$${i + 1}`).join(', ');
        const vals = Object.values(sanitized);
        await pool.query(`UPDATE inquiries SET ${sets}, updated_at=NOW() WHERE id=$${vals.length + 1}`, [...vals, id]);
        return json({ ok: true });
      }
      if (req.method === 'DELETE') {
        await pool.query('DELETE FROM inquiries WHERE id=$1', [id]);
        return json({ ok: true });
      }
    }

    // Generic CRUD
    for (const [table, config] of Object.entries(crudTables)) {
      if (adminPart === table && req.method === 'GET') {
        const rows = await pool.query(`SELECT * FROM ${table} ORDER BY sort_order ASC, id DESC`);
        return json(rows.rows);
      }
      if (adminPart === table && req.method === 'POST') {
        const body = await req.json();
        const sanitized = sanitizeObj(body);
        const cols = Object.keys(sanitized).filter(k => config.cols.includes(k));
        const vals = cols.map(k => sanitized[k]);
        const ph = cols.map((_, i) => `$${i + 1}`).join(', ');
        const result = await pool.query(`INSERT INTO ${table} (${cols.join(',')}) VALUES (${ph}) RETURNING id`, vals);
        return json({ ok: true, id: result.rows[0].id }, 201);
      }
      const idMatch = adminPart.match(new RegExp(`^${table}\\/(\\d+)$`));
      if (idMatch) {
        const id = parseInt(idMatch[1]);
        if (req.method === 'GET') {
          const row = (await pool.query(`SELECT * FROM ${table} WHERE id=$1`, [id])).rows[0];
          return row ? json(row) : err('Not found', 404);
        }
        if (req.method === 'PUT') {
          const body = await req.json();
          const sanitized = sanitizeObj(body);
          const cols = Object.keys(sanitized).filter(k => config.cols.includes(k));
          const vals = cols.map(k => sanitized[k]);
          const sets = cols.map((k, i) => `${k}=$${i + 1}`).join(', ');
          await pool.query(`UPDATE ${table} SET ${sets}, updated_at=NOW() WHERE id=$${vals.length + 1}`, [...vals, id]);
          return json({ ok: true });
        }
        if (req.method === 'DELETE') {
          await pool.query(`DELETE FROM ${table} WHERE id=$1`, [id]);
          return json({ ok: true });
        }
      }
    }

    return err('Not found', 404);
  } catch (e) {
    return json({ error: 'Server error: ' + e.message, stack: e.stack }, 500);
  }
};
