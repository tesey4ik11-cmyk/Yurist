const pool = require('./db');

const defaultSettings = {
  company_name: 'НАРБЕРА', company_short: 'Н', motto: 'Качественные и честные услуги с заботой о клиенте',
  city: 'Ярославль', region: 'Ярославская область', phone: '+7 (4852) 00-00-00',
  email: 'info@narbera.ru', address: '150000, Ярославская область, г. Ярославль',
  work_hours: 'Пн–Пт: 9:00–18:00', founded_year: '2020',
  copyright: '© {year} НАРБЕРА. Все права защищены.',
  hero_title: 'Юридическая помощь в Ярославской области',
  hero_subtitle: 'Помогаем решать юридические вопросы: от банкротства и долгов до семейных и трудовых споров. Первая консультация бесплатно.',
  hero_button: 'Получить бесплатную консультацию', hero_note: 'Ответим на вопросы и оценим вашу ситуацию',
  hero_badge: 'Бесплатная первичная консультация', hero_trust: 'Конфиденциально · Без давления · По закону',
  hero_image: 'images/Фото юриста.jpg', about_title: 'Профессиональная команда',
  about_role: 'Юристы с опытом в различных отраслях права',
  about_bio: 'Мы специализируемся на банкротстве физических лиц, но также оказываем полный спектр юридических услуг для граждан.',
  telegram: 'https://t.me/narbera', vk: 'https://vk.com/narbera', max_url: 'https://max.ru/narbera',
  seo_title: 'Юридические услуги в Ярославской области — НАРБЕРА',
  seo_description: 'Юридическая помощь: банкротство физических лиц, взыскание долгов, семейное, трудовое и жилищное право.',
  seo_keywords: 'юрист Ярославль, банкротство физических лиц, юридические услуги',
  seo_og_title: 'Юридические услуги — НАРБЕРА', seo_og_description: 'Юридическая помощь в Ярославской области.',
  seo_og_image: '', seo_favicon: '', seo_canonical: 'https://narbera.ru/',
  show_reviews: '1', show_cases: '1', show_prices: '0', show_faq: '1', show_social: '1', show_mobile_bar: '1',
  site_name: 'НАРБЕРА', primary_color: '#b8944f', secondary_color: '#0c1222', language: 'ru', timezone: 'Europe/Moscow',
};

const defaultServices = [
  { title: 'Банкротство физических лиц', description: 'Полное сопровождение процедуры от анализа перспектив до завершения дела.', icon: '⚖️', sort_order: 1 },
  { title: 'Взыскание долгов', description: 'Представительство в суде, работа с приставами, восстановление нарушенных прав.', icon: '💰', sort_order: 2 },
  { title: 'Семейное право', description: 'Раздел имущества, алименты, бракоразводные процессы.', icon: '👨\u200d👩\u200d👧', sort_order: 3 },
  { title: 'Трудовое право', description: 'Восстановление на работе, взыскание зарплаты, оспаривание увольнения.', icon: '💼', sort_order: 4 },
  { title: 'Жилищное право', description: 'Споры с УК, выселение, прописка, наследование жилья.', icon: '🏠', sort_order: 5 },
  { title: 'Судебное представительство', description: 'Ведение дел в судах всех инстанций. Подготовка исков, жалоб, ходатайств.', icon: '📋', sort_order: 6 },
];

const defaultAdvantages = [
  { title: 'Понятно объясняем', description: 'Без сложной юридической терминологии.', icon: '💬', sort_order: 1 },
  { title: 'Сопровождаем лично', description: 'Один юрист ведёт дело от начала до конца.', icon: '🤝', sort_order: 2 },
  { title: 'Работаем по закону', description: 'Без сомнительных схем и обещаний невозможного.', icon: '⚖️', sort_order: 3 },
  { title: 'Конфиденциально', description: 'Информация не разглашается третьим лицам.', icon: '🔒', sort_order: 4 },
  { title: 'Прозрачные условия', description: 'Стоимость объясняются до начала сотрудничества.', icon: '📄', sort_order: 5 },
  { title: 'Всегда на связи', description: 'Вы можете задать вопрос и получить ответ в удобное время.', icon: '📱', sort_order: 6 },
];

const defaultSteps = [
  { number: 1, title: 'Консультация', description: 'Разбираем ситуацию и отвечаем на вопросы. Бесплатно.', sort_order: 1 },
  { number: 2, title: 'Анализ', description: 'Изучаем документы и формируем объективную картину.', sort_order: 2 },
  { number: 3, title: 'Стратегия', description: 'Разрабатываем план действий.', sort_order: 3 },
  { number: 4, title: 'Сопровождение', description: 'Представляем ваши интересы в суде.', sort_order: 4 },
  { number: 5, title: 'Завершение', description: 'Подводим итоги и объясняем дальнейшие действия.', sort_order: 5 },
];

const defaultFaq = [
  { question: 'Что такое банкротство физического лица?', answer: 'Судебная процедура, позволяющая гражданину решить вопрос с долгами.', sort_order: 1 },
  { question: 'Обязательно ли идти в суд?', answer: 'Да, процедура проходит в судебном порядке.', sort_order: 2 },
  { question: 'Можно ли сохранить имущество?', answer: 'Закон предусматривает перечень имущества, которое не подлежит изъятию.', sort_order: 3 },
  { question: 'Сколько длится процедура?', answer: 'Сроки зависят от обстоятельств дела.', sort_order: 4 },
  { question: 'Сколько стоит сопровождение?', answer: 'Стоимость зависит от сложности дела.', sort_order: 5 },
  { question: 'Можно ли пройти процедуру, если работаешь?', answer: 'Да, трудоустройство не является препятствием.', sort_order: 6 },
];

const defaultCases = [
  { title: 'Три кредита и микрозайм', situation: 'Женщина 38 лет.', problem: 'Платежи превышали доход в два раза.', solution: 'Оценка перспектив, подготовка документов.', result: 'Долги списаны.', is_demo: 1 },
  { title: 'Исполнительные производства', situation: 'Мужчина 42 года.', problem: 'Удержания с зарплаты, долги растут.', solution: 'Анализ документов, подготовка к банкротству.', result: 'Производства прекращены.', is_demo: 1 },
  { title: 'Трудовой спор', situation: 'Женщина 30 лет, работает 5 лет.', problem: 'Уволена без оснований.', solution: 'Иск о восстановлении.', result: 'Восстановлена, взыскана зарплата.', is_demo: 1 },
];

const defaultReviews = [
  { author_name: 'Елена С.', city: 'Ярославль', text: 'Долго не могла решиться. На консультации всё объяснили без давления.', rating: 5, date: '2025-03-15', is_demo: 1 },
  { author_name: 'Андрей К.', city: 'Тутаев', text: 'Всё было прозрачно. С самого начала объяснили стоимость и порядок.', rating: 5, date: '2025-01-20', is_demo: 1 },
  { author_name: 'Мария В.', city: 'Рыбинск', text: 'Юрист нашёл подходящий язык и помог разобраться.', rating: 5, date: '2025-04-10', is_demo: 1 },
];

async function seedDatabase() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Settings
    for (const [key, value] of Object.entries(defaultSettings)) {
      await client.query('INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING', [key, value]);
    }

    // Expert
    const expCheck = await client.query('SELECT id FROM expert LIMIT 1');
    if (expCheck.rows.length === 0) {
      await client.query(
        'INSERT INTO expert (name, role, photo_url, bio, experience, specialization, achievements, stats) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
        ['Профессиональная команда', 'Юристы с опытом', 'images/Фото юриста.jpg',
         'Мы специализируемся на банкротстве физических лиц.', '10+',
         'Банкротство, семейное, трудовое право', '',
         '10+ лет практики, 500+ консультаций, 98% довольных клиентов']
      );
    }

    // Contacts
    const cntCheck = await client.query('SELECT id FROM contacts LIMIT 1');
    if (cntCheck.rows.length === 0) {
      await client.query(
        'INSERT INTO contacts (phone, email, telegram, vk, max_url, address, work_hours) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [defaultSettings.phone, defaultSettings.email, defaultSettings.telegram, defaultSettings.vk, defaultSettings.max_url, defaultSettings.address, defaultSettings.work_hours]
      );
    }

    // Services
    const svcCount = await client.query('SELECT COUNT(*) as c FROM services');
    if (parseInt(svcCount.rows[0].c) === 0) {
      for (const s of defaultServices) {
        await client.query('INSERT INTO services (title, description, icon, sort_order) VALUES ($1,$2,$3,$4)', [s.title, s.description, s.icon, s.sort_order]);
      }
    }

    // Advantages
    const advCount = await client.query('SELECT COUNT(*) as c FROM advantages');
    if (parseInt(advCount.rows[0].c) === 0) {
      for (const a of defaultAdvantages) {
        await client.query('INSERT INTO advantages (title, description, icon, sort_order) VALUES ($1,$2,$3,$4)', [a.title, a.description, a.icon, a.sort_order]);
      }
    }

    // Steps
    const stepCount = await client.query('SELECT COUNT(*) as c FROM steps');
    if (parseInt(stepCount.rows[0].c) === 0) {
      for (const s of defaultSteps) {
        await client.query('INSERT INTO steps (number, title, description, sort_order) VALUES ($1,$2,$3,$4)', [s.number, s.title, s.description, s.sort_order]);
      }
    }

    // FAQ
    const faqCount = await client.query('SELECT COUNT(*) as c FROM faq');
    if (parseInt(faqCount.rows[0].c) === 0) {
      for (const f of defaultFaq) {
        await client.query('INSERT INTO faq (question, answer, sort_order) VALUES ($1,$2,$3)', [f.question, f.answer, f.sort_order]);
      }
    }

    // Cases
    const caseCount = await client.query('SELECT COUNT(*) as c FROM cases');
    if (parseInt(caseCount.rows[0].c) === 0) {
      for (const c of defaultCases) {
        await client.query('INSERT INTO cases (title, situation, problem, solution, result, is_demo) VALUES ($1,$2,$3,$4,$5,$6)', [c.title, c.situation, c.problem, c.solution, c.result, c.is_demo]);
      }
    }

    // Reviews
    const revCount = await client.query('SELECT COUNT(*) as c FROM reviews');
    if (parseInt(revCount.rows[0].c) === 0) {
      for (const r of defaultReviews) {
        await client.query('INSERT INTO reviews (author_name, city, text, rating, date, is_demo) VALUES ($1,$2,$3,$4,$5,$6)', [r.author_name, r.city, r.text, r.rating, r.date, r.is_demo]);
      }
    }

    // SEO
    const seoCount = await client.query('SELECT COUNT(*) as c FROM seo');
    if (parseInt(seoCount.rows[0].c) === 0) {
      await client.query(
        "INSERT INTO seo (page, title, description, og_title, og_description, canonical) VALUES ('home',$1,$2,$3,$4,$5)",
        [defaultSettings.seo_title, defaultSettings.seo_description, defaultSettings.seo_og_title, defaultSettings.seo_og_description, defaultSettings.seo_canonical]
      );
    }

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

module.exports = { seedDatabase };
