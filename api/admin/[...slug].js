process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = require('../lib/db');
const { authenticate, hashPassword, createToken } = require('../lib/auth');
const { json, err, sanitizeObj } = require('../lib/helpers');
const { seedDatabase } = require('../lib/seed');
const fs = require('fs');
const path = require('path');

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
    const adminSlug = url.pathname.replace(/^\/api\/admin\//, '').replace(/^\/+|\/+$/g, '');

    const body = req.method === 'GET' ? {} : await getBody(req);
    const method = (body._method || req.method).toUpperCase();

    // Login (no auth)
    if (adminSlug === 'login' && req.method === 'POST') {
      const ip = req.headers['x-forwarded-for'] || 'unknown';
      const now = Date.now();
      const attempts = loginAttempts.get(ip) || [];
      const recent = attempts.filter(t => now - t < 60000);
      if (recent.length >= 5) return err(res, 'Слишком много попыток.', 429);
      recent.push(now);
      loginAttempts.set(ip, recent);
      const { email, password } = body;
      if (!email || !password) return err(res, 'Введите email и пароль');
      const hash = hashPassword(password);
      if (email !== process.env.ADMIN_EMAIL || hash !== process.env.ADMIN_PASSWORD_HASH) {
        return err(res, 'Неверный email или пароль', 401);
      }
      const token = createToken(email, process.env.JWT_SECRET);
      return json(res, { token, email });
    }

    // Upload
    if (adminSlug === 'upload' && req.method === 'POST') {
      const user = authenticate(req);
      if (!user) return err(res, 'Не авторизован', 401);
      const { data } = body;
      if (!data) return err(res, 'Нет данных файла');
      const match = data.match(/^data:(image\/\w+);base64,(.+)$/);
      if (!match) return err(res, 'Неверный формат');
      const ext = match[1].split('/')[1] || 'png';
      const buf = Buffer.from(match[2], 'base64');
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      const name = `${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
      fs.writeFileSync(path.join(uploadDir, name), buf);
      return json(res, { url: `/uploads/${name}` });
    }

    // Auth required
    const user = authenticate(req);
    if (!user) return err(res, 'Не авторизован', 401);

    await ensureDb();

    if (adminSlug === 'me' && method === 'GET') return json(res, { email: user.email });

    if (adminSlug === 'dashboard' && method === 'GET') {
      const total = (await pool.query('SELECT COUNT(*) as c FROM inquiries')).rows[0];
      const newI = (await pool.query("SELECT COUNT(*) as c FROM inquiries WHERE status='new'")).rows[0];
      const svc = (await pool.query('SELECT COUNT(*) as c FROM services')).rows[0];
      const rev = (await pool.query('SELECT COUNT(*) as c FROM reviews')).rows[0];
      const recent = (await pool.query('SELECT * FROM inquiries ORDER BY created_at DESC LIMIT 10')).rows;
      return json(res, {
        stats: { total_inquiries: +total.c, new_inquiries: +newI.c, services: +svc.c, reviews: +rev.c },
        recent_inquiries: recent,
      });
    }

    if (adminSlug === 'settings') {
      if (method === 'GET') {
        const rows = await pool.query('SELECT key, value FROM settings');
        const s = {}; for (const r of rows.rows) s[r.key] = r.value;
        return json(res, s);
      }
      const sanitized = sanitizeObj(body);
      delete sanitized._method;
      for (const [k, v] of Object.entries(sanitized)) {
        await pool.query('INSERT INTO settings (key,value,updated_at) VALUES ($1,$2,NOW()) ON CONFLICT (key) DO UPDATE SET value=$2,updated_at=NOW()', [k, String(v)]);
      }
      return json(res, { ok: true });
    }

    if (adminSlug === 'expert') {
      if (method === 'GET') {
        const row = (await pool.query('SELECT * FROM expert LIMIT 1')).rows[0] || {};
        return json(res, row);
      }
      const sanitized = sanitizeObj(body);
      delete sanitized._method;
      const existing = (await pool.query('SELECT id FROM expert LIMIT 1')).rows[0];
      if (existing) {
        const sets = Object.keys(sanitized).map((k,i) => `${k}=$${i+1}`).join(',');
        await pool.query(`UPDATE expert SET ${sets},updated_at=NOW() WHERE id=$${Object.keys(sanitized).length+1}`, [...Object.values(sanitized), existing.id]);
      } else {
        const cols = Object.keys(sanitized);
        const ph = cols.map((_,i) => `$${i+1}`).join(',');
        await pool.query(`INSERT INTO expert (${cols.join(',')}) VALUES (${ph})`, Object.values(sanitized));
      }
      return json(res, { ok: true });
    }

    if (adminSlug === 'contacts') {
      if (method === 'GET') {
        const row = (await pool.query('SELECT * FROM contacts LIMIT 1')).rows[0] || {};
        return json(res, row);
      }
      const sanitized = sanitizeObj(body);
      delete sanitized._method;
      const existing = (await pool.query('SELECT id FROM contacts LIMIT 1')).rows[0];
      if (existing) {
        const sets = Object.keys(sanitized).map((k,i) => `${k}=$${i+1}`).join(',');
        await pool.query(`UPDATE contacts SET ${sets},updated_at=NOW() WHERE id=$${Object.keys(sanitized).length+1}`, [...Object.values(sanitized), existing.id]);
      } else {
        const cols = Object.keys(sanitized);
        const ph = cols.map((_,i) => `$${i+1}`).join(',');
        await pool.query(`INSERT INTO contacts (${cols.join(',')}) VALUES (${ph})`, Object.values(sanitized));
      }
      return json(res, { ok: true });
    }

    if (adminSlug === 'seo') {
      if (method === 'GET') {
        const row = (await pool.query("SELECT * FROM seo WHERE page='home' LIMIT 1")).rows[0] || {};
        return json(res, row);
      }
      const sanitized = sanitizeObj(body);
      delete sanitized._method;
      const existing = (await pool.query("SELECT id FROM seo WHERE page='home' LIMIT 1")).rows[0];
      if (existing) {
        const sets = Object.keys(sanitized).map((k,i) => `${k}=$${i+1}`).join(',');
        await pool.query(`UPDATE seo SET ${sets},updated_at=NOW() WHERE id=$${Object.keys(sanitized).length+1}`, [...Object.values(sanitized), existing.id]);
      } else {
        const cols = ['page', ...Object.keys(sanitized)];
        const vals = ['home', ...Object.values(sanitized)];
        const ph = cols.map((_,i) => `$${i+1}`).join(',');
        await pool.query(`INSERT INTO seo (${cols.join(',')}) VALUES (${ph})`, vals);
      }
      return json(res, { ok: true });
    }

    if (adminSlug === 'inquiries' && method === 'GET') {
      const rows = await pool.query('SELECT * FROM inquiries ORDER BY created_at DESC');
      return json(res, rows.rows);
    }

    const inqMatch = adminSlug.match(/^inquiries\/(\d+)$/);
    if (inqMatch && method !== 'GET') {
      const id = parseInt(inqMatch[1]);
      if (method === 'DELETE') {
        await pool.query('DELETE FROM inquiries WHERE id=$1', [id]);
        return json(res, { ok: true });
      }
      const sanitized = sanitizeObj(body);
      delete sanitized._method;
      if (Object.keys(sanitized).length) {
        const sets = Object.keys(sanitized).map((k,i) => `${k}=$${i+1}`).join(',');
        await pool.query(`UPDATE inquiries SET ${sets},updated_at=NOW() WHERE id=$${Object.keys(sanitized).length+1}`, [...Object.values(sanitized), id]);
      }
      return json(res, { ok: true });
    }

    for (const [table, config] of Object.entries(crudTables)) {
      if (adminSlug === table && method === 'GET') {
        const rows = await pool.query(`SELECT * FROM ${table} ORDER BY sort_order ASC, id DESC`);
        return json(res, rows.rows);
      }
      if (adminSlug === table && (method === 'POST' || method === 'PUT')) {
        const sanitized = sanitizeObj(body);
        delete sanitized._method;
        const cols = Object.keys(sanitized).filter(k => config.cols.includes(k));
        const vals = cols.map(k => sanitized[k]);
        const ph = cols.map((_,i) => `$${i+1}`).join(',');
        const result = await pool.query(`INSERT INTO ${table} (${cols.join(',')}) VALUES (${ph}) RETURNING id`, vals);
        return json(res, { ok: true, id: result.rows[0].id }, 201);
      }
      const idMatch = adminSlug.match(new RegExp(`^${table}\\/(\\d+)$`));
      if (idMatch) {
        const id = parseInt(idMatch[1]);
        if (method === 'GET') {
          const row = (await pool.query(`SELECT * FROM ${table} WHERE id=$1`, [id])).rows[0];
          return row ? json(res, row) : err(res, 'Not found', 404);
        }
        if (method === 'DELETE') {
          await pool.query(`DELETE FROM ${table} WHERE id=$1`, [id]);
          return json(res, { ok: true });
        }
        if (method === 'PUT' || method === 'POST') {
          const sanitized = sanitizeObj(body);
          delete sanitized._method;
          const cols = Object.keys(sanitized).filter(k => config.cols.includes(k));
          const vals = cols.map(k => sanitized[k]);
          if (cols.length) {
            const sets = cols.map((k,i) => `${k}=$${i+1}`).join(',');
            await pool.query(`UPDATE ${table} SET ${sets},updated_at=NOW() WHERE id=$${cols.length+1}`, [...vals, id]);
          }
          return json(res, { ok: true });
        }
      }
    }

    return err(res, 'Not found', 404);
  } catch (e) {
    return json(res, { error: e.message }, 500);
  }
};
