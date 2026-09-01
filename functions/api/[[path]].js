// ============================================================
// НАРБЕРА — Cloudflare Pages Function (API)
// functions/api/[[path]].js
// ============================================================

// --- CORS Headers ---
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

function err(msg, status = 400) {
  return json({ error: msg }, status);
}

// --- Auth Helpers ---
async function hashPassword(password) {
  const data = new TextEncoder().encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function createToken(email, secret) {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ email, exp: Date.now() + 86400000 }));
  const data = `${header}.${payload}`;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return `${data}.${btoa(String.fromCharCode(...new Uint8Array(sig)))}`;
}

async function verifyToken(token, secret) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const data = `${parts[0]}.${parts[1]}`;
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const sig = Uint8Array.from(atob(parts[2]), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify('HMAC', key, sig, new TextEncoder().encode(data));
    if (!valid) return null;
    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch { return null; }
}

async function authenticate(request, env) {
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return verifyToken(auth.slice(7), env.JWT_SECRET);
}

// --- Rate Limiting (simple in-memory) ---
const loginAttempts = new Map();

function checkRateLimit(ip, env) {
  const now = Date.now();
  const attempts = loginAttempts.get(ip) || [];
  const recent = attempts.filter(t => now - t < 60000);
  if (recent.length >= 5) return false;
  recent.push(now);
  loginAttempts.set(ip, recent);
  return true;
}

// --- Input Sanitization ---
function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
}

function sanitizeObj(obj) {
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    result[k] = typeof v === 'string' ? sanitize(v) : v;
  }
  return result;
}

// --- Default Seed Data ---
function getDefaultSettings() {
  return {
    'company_name': 'НАРБЕРА',
    'company_short': 'Н',
    'motto': 'Качественные и честные услуги с заботой о клиенте',
    'city': 'Ярославль',
    'region': 'Ярославская область',
    'phone': '+7 (4852) 00-00-00',
    'email': 'info@narbera.ru',
    'address': '150000, Ярославская область, г. Ярославль',
    'work_hours': 'Пн–Пт: 9:00–18:00',
    'founded_year': '2020',
    'copyright': '© {year} НАРБЕРА. Все права защищены.',
    'hero_title': 'Юридическая помощь <span>в Ярославской области</span>',
    'hero_subtitle': 'Помогаем решать юридические вопросы: от банкротства и долгов до семейных и трудовых споров. Первая консультация бесплатно.',
    'hero_button': 'Получить бесплатную консультацию',
    'hero_note': 'Ответим на вопросы и оценим вашу ситуацию',
    'hero_badge': 'Бесплатная первичная консультация',
    'hero_trust': 'Конфиденциально · Без давления · По закону',
    'hero_image': 'images/Фото юриста.jpg',
    'about_title': 'Профессиональная команда',
    'about_role': 'Юристы с опытом в различных отраслях права',
    'about_bio': 'Мы специализируемся на банкротстве физических лиц, но также оказываем полный спектр юридических услуг для граждан.',
    'telegram': 'https://t.me/narbera',
    'vk': 'https://vk.com/narbera',
    'max_url': 'https://max.ru/narbera',
    'seo_title': 'Юридические услуги в Ярославской области — НАРБЕРА',
    'seo_description': 'Юридическая помощь: банкротство физических лиц, взыскание долгов, семейное, трудовое и жилищное право. Бесплатная консультация в Ярославской области.',
    'seo_keywords': 'юрист Ярославль, банкротство физических лиц, юридические услуги',
    'seo_og_title': 'Юридические услуги — НАРБЕРА',
    'seo_og_description': 'Юридическая помощь в Ярославской области. Бесплатная консультация.',
    'seo_og_image': '',
    'seo_favicon': '',
    'seo_canonical': 'https://narbera.ru/',
    'show_reviews': '1',
    'show_cases': '1',
    'show_prices': '0',
    'show_faq': '1',
    'show_social': '1',
    'show_mobile_bar': '1',
    'site_name': 'НАРБЕРА',
    'primary_color': '#b8944f',
    'secondary_color': '#0c1222',
    'language': 'ru',
    'timezone': 'Europe/Moscow',
  };
}

function getDefaultServices() {
  return [
    { title: 'Банкротство физических лиц', description: 'Полное сопровождение процедуры от анализа перспектив до завершения дела.', icon: '⚖️', sort_order: 1 },
    { title: 'Взыскание долгов', description: 'Представительство в суде, работа с приставами, восстановление нарушенных прав.', icon: '💰', sort_order: 2 },
    { title: 'Семейное право', description: 'Раздел имущества, алименты, бракоразводные процессы.', icon: '👨‍👩‍👧', sort_order: 3 },
    { title: 'Трудовое право', description: 'Восстановление на работе, взыскание зарплаты, оспаривание увольнения.', icon: '💼', sort_order: 4 },
    { title: 'Жилищное право', description: 'Споры с УК, выселение, прописка, наследование жилья.', icon: '🏠', sort_order: 5 },
    { title: 'Судебное представительство', description: 'Ведение дел в судах всех инстанций. Подготовка исков, жалоб, ходатайств.', icon: '📋', sort_order: 6 },
  ];
}

function getDefaultAdvantages() {
  return [
    { title: 'Понятно объясняем', description: 'Без сложной юридической терминологии. Вы понимаете, что происходит на каждом этапе.', icon: '💬', sort_order: 1 },
    { title: 'Сопровождаем лично', description: 'Вы знаете, кто занимается вашим делом. Один юрист ведёт дело от начала до конца.', icon: '🤝', sort_order: 2 },
    { title: 'Работаем по закону', description: 'Без сомнительных схем и обещаний невозможного. Только законные варианты решения.', icon: '⚖️', sort_order: 3 },
    { title: 'Конфиденциально', description: 'Информация о вашей ситуации не разглашается третьим лицам без вашего согласия.', icon: '🔒', sort_order: 4 },
    { title: 'Прозрачные условия', description: 'Стоимость и порядок работы объясняются до начала сотрудничества.', icon: '📄', sort_order: 5 },
    { title: 'Всегда на связи', description: 'Вы можете задать вопрос специалисту и получить ответ в удобное время.', icon: '📱', sort_order: 6 },
  ];
}

function getDefaultExpert() {
  return {
    name: 'Профессиональная команда',
    role: 'Юристы с опытом в различных отраслях права',
    photo_url: 'images/Фото юриста.jpg',
    bio: 'Мы специализируемся на банкротстве физических лиц, но также оказываем полный спектр юридических услуг для граждан. Индивидуальный подход к каждому клиенту.',
    experience: '10+',
    specialization: 'Банкротство, семейное, трудовое право',
    achievements: '',
    stats: JSON.stringify([
      { value: '10+', label: 'лет практики' },
      { value: '500+', label: 'консультаций' },
      { value: '98%', label: 'довольных клиентов' }
    ]),
  };
}

function getDefaultSteps() {
  return [
    { number: 1, title: 'Консультация', description: 'Разбираем ситуацию и отвечаем на основные вопросы. Бесплатно и без обязательств.', sort_order: 1 },
    { number: 2, title: 'Анализ', description: 'Изучаем документы, обстоятельства и формируем объективную картину вашей ситуации.', sort_order: 2 },
    { number: 3, title: 'Стратегия', description: 'Разрабатываем план действий и определяем наиболее эффективный путь решения.', sort_order: 3 },
    { number: 4, title: 'Сопровождение', description: 'Представляем ваши интересы в суде, при общении с кредиторами и приставами.', sort_order: 4 },
    { number: 5, title: 'Завершение', description: 'Подводим итоги процедуры и объясняем дальнейшие действия.', sort_order: 5 },
  ];
}

function getDefaultFaq() {
  return [
    { question: 'Что такое банкротство физического лица?', answer: 'Банкротство физического лица — это судебная процедура, которая позволяет гражданину, не способному исполнить денежные обязательства, решить вопрос с долгами в установленном законом порядке.', sort_order: 1 },
    { question: 'Обязательно ли идти в суд?', answer: 'Да, процедура банкротства физического лица проходит в судебном порядке. Однако наличие юриста существенно упрощает процесс.', sort_order: 2 },
    { question: 'Можно ли сохранить имущество?', answer: 'Закон предусматривает перечень имущества, которое не подлежит изъятию. В частности, единственное жильё и предметы обычной домашней обстановки.', sort_order: 3 },
    { question: 'Сколько длится процедура?', answer: 'Сроки зависят от конкретных обстоятельств дела. На продолжительность влияют количество кредиторов и объём документации.', sort_order: 4 },
    { question: 'Сколько стоит сопровождение?', answer: 'Стоимость зависит от сложности дела. На бесплатной консультации мы можем обсудить вашу ситуацию и назвать примерную стоимость.', sort_order: 5 },
    { question: 'Можно ли пройти процедуру, если официально работаешь?', answer: 'Да, наличие официального трудоустройства не является препятствием для банкротства.', sort_order: 6 },
  ];
}

function getDefaultCases() {
  return [
    { title: 'Три кредита и микрозайм', situation: 'Женщина 38 лет. Три потребительских кредита и микрозайм.', problem: 'Ежемесячные платежи превышали доход в два раза.', solution: 'Проведена оценка перспектив, подготовлены документы, подано заявление на банкротство.', result: 'Процедура завершена. Долги списаны в установленном законом порядке.', is_demo: 1 },
    { title: 'Исполнительные производства', situation: 'Мужчина 42 года, работает на заводе. Несколько исполнительных производств.', problem: 'С зарплаты удерживают максимум по закону, но долги продолжают расти.', solution: 'Проанализированы все исполнительные документы, подготовлены документы для банкротства.', result: 'Банкротство завершено. Исполнительные производства прекращены.', is_demo: 1 },
    { title: 'Трудовой спор: восстановление на работе', situation: 'Женщина 30 лет, работает 5 лет. Уволена без законных оснований.', problem: 'Работодатель отказался выплачивать выходное пособие.', solution: 'Подан иск о восстановлении на работе и взыскании заработной платы.', result: 'Суд восстановил на работе. Взыскана заработная плата и компенсация.', is_demo: 1 },
  ];
}

function getDefaultReviews() {
  return [
    { author_name: 'Елена С.', city: 'Ярославль', text: 'Долго не могла решиться на первый шаг. На консультации мне всё подробно объяснили без давления.', rating: 5, date: '2025-03-15', is_demo: 1 },
    { author_name: 'Андрей К.', city: 'Тутаев', text: 'Всё было прозрачно. С самого начала объяснили стоимость, порядок и сроки. Рекомендую.', rating: 5, date: '2025-01-20', is_demo: 1 },
    { author_name: 'Мария В.', city: 'Рыбинск', text: 'Меня беспокоило, что всё сложно и непонятно. Но юрист нашёл подходящий язык и помог разобраться.', rating: 5, date: '2025-04-10', is_demo: 1 },
  ];
}

// --- Seed Database ---
async function seedDatabase(db) {
  // Settings
  const settings = getDefaultSettings();
  for (const [key, value] of Object.entries(settings)) {
    await db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)').bind(key, value).run();
  }
  // Expert
  const exp = getDefaultExpert();
  const existing = await db.prepare('SELECT id FROM expert LIMIT 1').first();
  if (!existing) {
    await db.prepare('INSERT INTO expert (name, role, photo_url, bio, experience, specialization, achievements, stats) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(exp.name, exp.role, exp.photo_url, exp.bio, exp.experience, exp.specialization, exp.achievements, exp.stats).run();
  }
  // Contacts
  const cnt = (await db.prepare('SELECT id FROM contacts LIMIT 1').first());
  if (!cnt) {
    await db.prepare('INSERT INTO contacts (phone, email, telegram, vk, max_url, address, work_hours) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(settings.phone, settings.email, settings.telegram, settings.vk, settings.max_url, settings.address, settings.work_hours).run();
  }
  // Services
  const svcCount = (await db.prepare('SELECT COUNT(*) as c FROM services').first()).c;
  if (svcCount === 0) {
    for (const s of getDefaultServices()) {
      await db.prepare('INSERT INTO services (title, description, icon, sort_order) VALUES (?, ?, ?, ?)').bind(s.title, s.description, s.icon, s.sort_order).run();
    }
  }
  // Advantages
  const advCount = (await db.prepare('SELECT COUNT(*) as c FROM advantages').first()).c;
  if (advCount === 0) {
    for (const a of getDefaultAdvantages()) {
      await db.prepare('INSERT INTO advantages (title, description, icon, sort_order) VALUES (?, ?, ?, ?)').bind(a.title, a.description, a.icon, a.sort_order).run();
    }
  }
  // Steps
  const stepCount = (await db.prepare('SELECT COUNT(*) as c FROM steps').first()).c;
  if (stepCount === 0) {
    for (const s of getDefaultSteps()) {
      await db.prepare('INSERT INTO steps (number, title, description, sort_order) VALUES (?, ?, ?, ?)').bind(s.number, s.title, s.description, s.sort_order).run();
    }
  }
  // FAQ
  const faqCount = (await db.prepare('SELECT COUNT(*) as c FROM faq').first()).c;
  if (faqCount === 0) {
    for (const f of getDefaultFaq()) {
      await db.prepare('INSERT INTO faq (question, answer, sort_order) VALUES (?, ?, ?)').bind(f.question, f.answer, f.sort_order).run();
    }
  }
  // Cases
  const caseCount = (await db.prepare('SELECT COUNT(*) as c FROM cases').first()).c;
  if (caseCount === 0) {
    for (const c of getDefaultCases()) {
      await db.prepare('INSERT INTO cases (title, situation, problem, solution, result, is_demo) VALUES (?, ?, ?, ?, ?, ?)').bind(c.title, c.situation, c.problem, c.solution, c.result, c.is_demo).run();
    }
  }
  // Reviews
  const revCount = (await db.prepare('SELECT COUNT(*) as c FROM reviews').first()).c;
  if (revCount === 0) {
    for (const r of getDefaultReviews()) {
      await db.prepare('INSERT INTO reviews (author_name, city, text, rating, date, is_demo) VALUES (?, ?, ?, ?, ?, ?)').bind(r.author_name, r.city, r.text, r.rating, r.date, r.is_demo).run();
    }
  }
  // SEO
  const seoCount = (await db.prepare('SELECT COUNT(*) as c FROM seo').first()).c;
  if (seoCount === 0) {
    await db.prepare("INSERT INTO seo (page, title, description, og_title, og_description, canonical) VALUES ('home', ?, ?, ?, ?, ?)").bind(settings.seo_title, settings.seo_description, settings.seo_og_title, settings.seo_og_description, settings.seo_canonical).run();
  }
}

// --- Main Handler ---
export async function onRequest(context) {
  const { request, env, params } = context;
  const method = request.method;
  const url = new URL(request.url);

  // CORS preflight
  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const segments = params.path || [];
  const path = segments.join('/');
  const db = env.DB;

  try {
    // Auto-seed on first request
    if (url.searchParams.has('seed')) {
      await seedDatabase(db);
      return json({ ok: true, message: 'Database seeded' });
    }

    // Ensure tables exist (lazy init)
    const tableCheck = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='settings'").first();
    if (!tableCheck) {
      await seedDatabase(db);
    }

    // ============ PUBLIC API ============

    // GET /api/site — full site data
    if (path === 'site' && method === 'GET') {
      const settingsRows = await db.prepare('SELECT key, value FROM settings').all();
      const settings = {};
      for (const row of settingsRows.results) settings[row.key] = row.value;
      const expert = await db.prepare('SELECT * FROM expert LIMIT 1').first();
      const contacts = await db.prepare('SELECT * FROM contacts LIMIT 1').first();
      const seo = await db.prepare("SELECT * FROM seo WHERE page='home' LIMIT 1").first();
      return json({ settings, expert: expert || {}, contacts: contacts || {}, seo: seo || {} });
    }

    // GET /api/services
    if (path === 'services' && method === 'GET') {
      const rows = await db.prepare('SELECT * FROM services WHERE active=1 ORDER BY sort_order ASC').all();
      return json(rows.results);
    }

    // GET /api/advantages
    if (path === 'advantages' && method === 'GET') {
      const rows = await db.prepare('SELECT * FROM advantages WHERE active=1 ORDER BY sort_order ASC').all();
      return json(rows.results);
    }

    // GET /api/steps
    if (path === 'steps' && method === 'GET') {
      const rows = await db.prepare('SELECT * FROM steps WHERE active=1 ORDER BY sort_order ASC').all();
      return json(rows.results);
    }

    // GET /api/cases
    if (path === 'cases' && method === 'GET') {
      const rows = await db.prepare('SELECT * FROM cases WHERE active=1 ORDER BY id DESC').all();
      return json(rows.results);
    }

    // GET /api/reviews
    if (path === 'reviews' && method === 'GET') {
      const rows = await db.prepare('SELECT * FROM reviews WHERE published=1 ORDER BY id DESC').all();
      return json(rows.results);
    }

    // GET /api/faq
    if (path === 'faq' && method === 'GET') {
      const rows = await db.prepare('SELECT * FROM faq WHERE active=1 ORDER BY sort_order ASC').all();
      return json(rows.results);
    }

    // GET /api/contacts
    if (path === 'contacts' && method === 'GET') {
      const row = await db.prepare('SELECT * FROM contacts LIMIT 1').first();
      return json(row || {});
    }

    // POST /api/inquiries — public form submission
    if (path === 'inquiries' && method === 'POST') {
      const body = await request.json();
      const name = sanitize(body.name || '');
      const phone = sanitize(body.phone || '');
      const contact_method = sanitize(body.contact_method || '');
      const message = sanitize(body.message || '');
      if (!name || !phone) return err('Имя и телефон обязательны');
      await db.prepare('INSERT INTO inquiries (name, phone, contact_method, message) VALUES (?, ?, ?, ?)').bind(name, phone, contact_method, message).run();
      // Email notification (if configured)
      if (env.NOTIFY_EMAIL && env.RESEND_API_KEY) {
        try {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: 'noreply@narbera.ru', to: env.NOTIFY_EMAIL, subject: `Новая заявка от ${name}`, html: `<p><b>Имя:</b> ${name}</p><p><b>Телефон:</b> ${phone}</p><p><b>Способ связи:</b> ${contact_method}</p><p><b>Сообщение:</b> ${message}</p>` }),
          });
        } catch (e) { /* ignore email errors */ }
      }
      return json({ ok: true, message: 'Заявка отправлена' }, 201);
    }

    // ============ ADMIN API ============

    // POST /api/admin/login
    if (path === 'admin/login' && method === 'POST') {
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      if (!checkRateLimit(ip, env)) return err('Слишком много попыток. Попробуйте через минуту.', 429);
      const body = await request.json();
      const { email, password } = body;
      if (!email || !password) return err('Введите email и пароль');
      const hash = await hashPassword(password);
      if (email !== env.ADMIN_EMAIL || hash !== env.ADMIN_PASSWORD_HASH) {
        return err('Неверный email или пароль', 401);
      }
      const token = await createToken(email, env.JWT_SECRET);
      return json({ token, email });
    }

    // GET /api/admin/me — verify token
    if (path === 'admin/me' && method === 'GET') {
      const user = await authenticate(request, env);
      if (!user) return err('Не авторизован', 401);
      return json({ email: user.email });
    }

    // All /api/admin/* routes require auth
    if (path.startsWith('admin/') && path !== 'admin/login') {
      const user = await authenticate(request, env);
      if (!user) return err('Не авторизован', 401);

      // --- Settings ---
      if (path === 'admin/settings' && method === 'GET') {
        const rows = await db.prepare('SELECT key, value FROM settings').all();
        const settings = {};
        for (const row of rows.results) settings[row.key] = row.value;
        return json(settings);
      }
      if (path === 'admin/settings' && method === 'PUT') {
        const body = await request.json();
        for (const [key, value] of Object.entries(body)) {
          await db.prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime("now"))').bind(key, String(value)).run();
        }
        return json({ ok: true });
      }

      // --- Dashboard ---
      if (path === 'admin/dashboard' && method === 'GET') {
        const inquiries = await db.prepare('SELECT COUNT(*) as c FROM inquiries').first();
        const newInquiries = await db.prepare("SELECT COUNT(*) as c FROM inquiries WHERE status='new'").first();
        const services = await db.prepare('SELECT COUNT(*) as c FROM services').first();
        const reviews = await db.prepare('SELECT COUNT(*) as c FROM reviews').first();
        const recentInquiries = await db.prepare('SELECT * FROM inquiries ORDER BY created_at DESC LIMIT 10').all();
        return json({
          stats: { total_inquiries: inquiries.c, new_inquiries: newInquiries.c, services: services.c, reviews: reviews.c },
          recent_inquiries: recentInquiries.results,
        });
      }

      // --- Generic CRUD helper ---
      const entityRoutes = {
        'admin/services': 'services',
        'admin/advantages': 'advantages',
        'admin/steps': 'steps',
        'admin/cases': 'cases',
        'admin/reviews': 'reviews',
        'admin/faq': 'faq',
      };

      for (const [route, table] of Object.entries(entityRoutes)) {
        // GET all
        if (path === route && method === 'GET') {
          const rows = await db.prepare(`SELECT * FROM ${table} ORDER BY sort_order ASC, id DESC`).all();
          return json(rows.results);
        }
        // POST create
        if (path === route && method === 'POST') {
          const body = await request.json();
          const sanitized = sanitizeObj(body);
          const cols = Object.keys(sanitized).filter(k => k !== 'id');
          const vals = cols.map(k => sanitized[k]);
          const placeholders = cols.map(() => '?').join(', ');
          const result = await db.prepare(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`).bind(...vals).run();
          return json({ ok: true, id: result.meta?.last_row_id }, 201);
        }
        // Check for ID routes: /api/admin/entity/123
        const idMatch = path.match(new RegExp(`^${route.replace('/', '\\/')}/(\\d+)$`));
        if (idMatch) {
          const id = parseInt(idMatch[1]);
          // PUT update
          if (method === 'PUT') {
            const body = await request.json();
            const sanitized = sanitizeObj(body);
            const sets = Object.keys(sanitized).map(k => `${k}=?`).join(', ');
            const vals = Object.values(sanitized);
            await db.prepare(`UPDATE ${table} SET ${sets}, updated_at=datetime('now') WHERE id=?`).bind(...vals, id).run();
            return json({ ok: true });
          }
          // DELETE
          if (method === 'DELETE') {
            await db.prepare(`DELETE FROM ${table} WHERE id=?`).bind(id).run();
            return json({ ok: true });
          }
        }
      }

      // --- Expert ---
      if (path === 'admin/expert' && method === 'GET') {
        const row = await db.prepare('SELECT * FROM expert LIMIT 1').first();
        return json(row || {});
      }
      if (path === 'admin/expert' && method === 'PUT') {
        const body = await request.json();
        const sanitized = sanitizeObj(body);
        const existing = await db.prepare('SELECT id FROM expert LIMIT 1').first();
        if (existing) {
          const sets = Object.keys(sanitized).map(k => `${k}=?`).join(', ');
          const vals = Object.values(sanitized);
          await db.prepare(`UPDATE expert SET ${sets}, updated_at=datetime('now') WHERE id=?`).bind(...vals, existing.id).run();
        } else {
          const cols = Object.keys(sanitized);
          const vals = Object.values(sanitized);
          await db.prepare(`INSERT INTO expert (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`).bind(...vals).run();
        }
        return json({ ok: true });
      }

      // --- Contacts ---
      if (path === 'admin/contacts' && method === 'GET') {
        const row = await db.prepare('SELECT * FROM contacts LIMIT 1').first();
        return json(row || {});
      }
      if (path === 'admin/contacts' && method === 'PUT') {
        const body = await request.json();
        const sanitized = sanitizeObj(body);
        const existing = await db.prepare('SELECT id FROM contacts LIMIT 1').first();
        if (existing) {
          const sets = Object.keys(sanitized).map(k => `${k}=?`).join(', ');
          const vals = Object.values(sanitized);
          await db.prepare(`UPDATE contacts SET ${sets}, updated_at=datetime('now') WHERE id=?`).bind(...vals, existing.id).run();
        } else {
          const cols = Object.keys(sanitized);
          const vals = Object.values(sanitized);
          await db.prepare(`INSERT INTO contacts (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`).bind(...vals).run();
        }
        return json({ ok: true });
      }

      // --- SEO ---
      if (path === 'admin/seo' && method === 'GET') {
        const row = await db.prepare("SELECT * FROM seo WHERE page='home' LIMIT 1").first();
        return json(row || {});
      }
      if (path === 'admin/seo' && method === 'PUT') {
        const body = await request.json();
        const sanitized = sanitizeObj(body);
        const existing = await db.prepare("SELECT id FROM seo WHERE page='home' LIMIT 1").first();
        if (existing) {
          const sets = Object.keys(sanitized).map(k => `${k}=?`).join(', ');
          const vals = Object.values(sanitized);
          await db.prepare(`UPDATE seo SET ${sets}, updated_at=datetime('now') WHERE id=?`).bind(...vals, existing.id).run();
        } else {
          const cols = ['page', ...Object.keys(sanitized)];
          const vals = ['home', ...Object.values(sanitized)];
          await db.prepare(`INSERT INTO seo (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`).bind(...vals).run();
        }
        return json({ ok: true });
      }

      // --- Inquiries ---
      if (path === 'admin/inquiries' && method === 'GET') {
        const rows = await db.prepare('SELECT * FROM inquiries ORDER BY created_at DESC').all();
        return json(rows.results);
      }
      const inquiryIdMatch = path.match(/^admin\/inquiries\/(\d+)$/);
      if (inquiryIdMatch) {
        const id = parseInt(inquiryIdMatch[1]);
        if (method === 'PUT') {
          const body = await request.json();
          const sanitized = sanitizeObj(body);
          const sets = Object.keys(sanitized).map(k => `${k}=?`).join(', ');
          const vals = Object.values(sanitized);
          await db.prepare(`UPDATE inquiries SET ${sets}, updated_at=datetime('now') WHERE id=?`).bind(...vals, id).run();
          return json({ ok: true });
        }
        if (method === 'DELETE') {
          await db.prepare('DELETE FROM inquiries WHERE id=?').bind(id).run();
          return json({ ok: true });
        }
      }

      // --- Upload ---
      if (path === 'admin/upload' && method === 'POST') {
        const formData = await request.formData();
        const file = formData.get('file');
        if (!file) return err('Файл не выбран');
        const key = `uploads/${Date.now()}-${file.name}`;
        await env.R2.put(key, file.stream(), { httpMetadata: { contentType: file.type } });
        const url = `${url.origin}/api/image/${key}`;
        return json({ ok: true, url, key });
      }
    }

    // --- Image proxy from R2 ---
    if (path.startsWith('image/') && method === 'GET') {
      const key = path.replace('image/', '');
      const obj = await env.R2.get(key);
      if (!obj) return err('Изображение не найдено', 404);
      const headers = new Headers(corsHeaders);
      headers.set('Content-Type', obj.httpMetadata?.contentType || 'image/jpeg');
      headers.set('Cache-Control', 'public, max-age=31536000');
      return new Response(obj.body, { headers });
    }

    // Fallback — not found
    return err('Not found', 404);

  } catch (e) {
    return err('Внутренняя ошибка сервера: ' + e.message, 500);
  }
}
