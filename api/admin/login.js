const { authenticate, hashPassword, createToken } = require('../lib/auth');
const { json, err } = require('../lib/helpers');

const loginAttempts = new Map();

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    return res.status(204).end();
  }

  if (req.method !== 'POST') return err(res, 'Method not allowed', 405);

  const ip = req.headers['x-forwarded-for'] || 'unknown';
  const now = Date.now();
  const attempts = loginAttempts.get(ip) || [];
  const recent = attempts.filter(t => now - t < 60000);
  if (recent.length >= 5) return err(res, 'Слишком много попыток.', 429);
  recent.push(now);
  loginAttempts.set(ip, recent);

  let body = {};

  // Try multiple body parsing methods
  if (req.body && typeof req.body === 'object') {
    body = req.body;
  } else if (typeof req.json === 'function') {
    try { body = await req.json(); } catch {}
  } else if (typeof req.text === 'function') {
    try { const t = await req.text(); body = JSON.parse(t); } catch {}
  } else {
    // Node.js IncomingMessage
    try {
      body = await new Promise((resolve) => {
        const chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', () => {
          const s = Buffer.concat(chunks).toString();
          try { resolve(JSON.parse(s)); } catch { resolve({}); }
        });
      });
    } catch {}
  }

  const { email, password } = body;
  if (!email || !password) return err(res, 'Введите email и пароль');
  const hash = hashPassword(password);
  if (email !== process.env.ADMIN_EMAIL || hash !== process.env.ADMIN_PASSWORD_HASH) {
    return err(res, 'Неверный email или пароль', 401);
  }
  const token = createToken(email, process.env.JWT_SECRET);
  return json(res, { token, email });
};
