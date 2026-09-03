const pool = require('./db');

const defaultSettings = {
  company_name: 'НАРБЕРА', company_short: 'Н', motto: 'Качественные и честные услуги с заботой о клиенте',
  city: 'Ярославль', region: 'Ярославская область', phone: '+7 (4852) 00-00-00',
  email: 'info@narbera.ru', address: '150000, Ярославская область, г. Ярославль',
  work_hours: 'Пн–Пт: 9:00–18:00', founded_year: '2020',
  copyright: '© {year} НАРБЕРА. Все права защищены.',
  inn: '7600000000', ogrn: '1237600000000',
  telegram: 'https://t.me/narbera', vk: 'https://vk.com/narbera', max_url: 'https://max.ru/narbera',
  hero_badge: '◆ Бесплатная первичная консультация',
  hero_title: 'Юридическая помощь в Ярославской области',
  hero_subtitle: 'Помогаем решать юридические вопросы: от банкротства и долгов до семейных и трудовых споров. Первая консультация бесплатно.',
  hero_button: 'Получить бесплатную консультацию',
  hero_call_button: 'Позвонить юристу',
  hero_note: 'Ответим на вопросы и оценим вашу ситуацию',
  hero_trust: 'Конфиденциально · Без давления · По закону',
  hero_image: 'images/Фото юриста.jpg',
  hero_image_badge_text: 'Юридическая практика',
  hero_image_badge_sub: 'Качественные и честные услуги',
  header_info: 'Юридическая помощь в Ярославской области',
  header_info_bold: 'Банкротство · Суды · Консультации',
  header_cta: 'Получить консультацию',
  problems_title: 'Юридические вопросы, которые требуют решения',
  problems_subtitle: 'Жизнь сталкивает с ситуациями, где нужна профессиональная помощь. Мы поможем разобраться',
  problems_button: 'Разобрать мою ситуацию',
  services_title: 'Наши услуги',
  services_subtitle: 'Полный спектр юридической помощи для граждан в Ярославской области',
  advantages_title: 'Почему выбирают нас',
  advantages_subtitle: 'Мы создаём условия, при которых вы можете сосредоточиться на важном',
  process_title: 'Как проходит работа',
  process_subtitle: 'Пошаговый процесс, который делает ситуацию понятной и управляемой',
  process_cta: 'Начать с бесплатной консультации',
  who_title: 'Возможно, вам стоит рассмотреть банкротство, если…',
  who_subtitle: 'Не автоматическое решение для всех, но серьёзный шаг для тех, кто столкнулся с одной или несколькими ситуациями',
  who_cta: 'Проверить мою ситуацию',
  cases_title: 'Демонстрационные примеры',
  cases_subtitle: 'Ниже представлены обобщённые примеры типичных ситуаций. Имена и детали изменены.',
  reviews_title: 'Отзывы',
  reviews_subtitle: 'Демонстрационные отзывы для макета. В реальной версии замените на настоящие отзывы клиентов.',
  faq_title: 'Часто задаваемые вопросы',
  faq_subtitle: 'Ответы на самые распространённые вопросы о наших услугах',
  form_title: 'Разберём вашу ситуацию на бесплатной консультации',
  form_subtitle: 'Оставьте заявку, и мы свяжемся с вами в ближайшее время',
  form_button: 'Получить консультацию',
  form_success_title: 'Спасибо! Заявка отправлена',
  form_success_text: 'Мы свяжемся с вами в ближайшее время для уточнения деталей.',
  contacts_title: 'Контакты',
  contacts_subtitle: 'Свяжитесь с нами любым удобным способом или приходите на консультацию',
  footer_disclaimer: 'Информация, размещённая на данном сайте, носит информационный характер и не является публичной офертой. Она не заменяет индивидуальную юридическую консультацию.',
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
  { title: 'Понятно объясняем', description: 'Без сложной юридической терминологии. Вы понимаете, что происходит на каждом этапе.', icon: '💬', sort_order: 1 },
  { title: 'Сопровождаем лично', description: 'Один юрист ведёт дело от начала до конца. Вы знаете, кто занимается вашим делом.', icon: '🤝', sort_order: 2 },
  { title: 'Работаем по закону', description: 'Без сомнительных схем и обещаний невозможного. Только законные варианты решения.', icon: '⚖️', sort_order: 3 },
  { title: 'Конфиденциально', description: 'Информация о вашей ситуации не разглашается третьим лицам без вашего согласия.', icon: '🔒', sort_order: 4 },
  { title: 'Прозрачные условия', description: 'Стоимость и порядок работы объясняются до начала сотрудничества. Без скрытых платежей.', icon: '📄', sort_order: 5 },
  { title: 'Всегда на связи', description: 'Вы можете задать вопрос специалисту и получить ответ в удобное время.', icon: '📱', sort_order: 6 },
];

const defaultSteps = [
  { number: 1, title: 'Консультация', description: 'Разбираем ситуацию и отвечаем на основные вопросы. Бесплатно и без обязательств.', sort_order: 1 },
  { number: 2, title: 'Анализ', description: 'Изучаем документы, обстоятельства и формируем объективную картину вашей ситуации.', sort_order: 2 },
  { number: 3, title: 'Стратегия', description: 'Разрабатываем план действий и определяем наиболее эффективный путь решения.', sort_order: 3 },
  { number: 4, title: 'Сопровождение', description: 'Представляем ваши интересы в суде, при общении с кредиторами, приставами.', sort_order: 4 },
  { number: 5, title: 'Завершение', description: 'Подводим итоги процедуры и объясняем дальнейшие действия.', sort_order: 5 },
];

const defaultFaq = [
  { question: 'Что такое банкротство физического лица?', answer: 'Банкротство физического лица — это судебная процедура, которая позволяет гражданину, не способному исполнить денежные обязательства, решить вопрос с долгами в установленном законом порядке. Процедура регулируется Федеральным законом № 127-ФЗ.', sort_order: 1 },
  { question: 'Обязательно ли идти в суд?', answer: 'Да, процедура банкротства физического лица проходит в судебном порядке. Заявление подаётся в арбитражный суд по месту жительства. Наличие юриста существенно упрощает процесс.', sort_order: 2 },
  { question: 'Можно ли сохранить имущество?', answer: 'Закон предусматривает перечень имущества, которое не подлежит изъятию. В частности, единственное жильё (при условии, что оно не в ипотеке), предметы обычной домашней обстановки.', sort_order: 3 },
  { question: 'Что будет с кредитами?', answer: 'В случае успешного завершения процедуры банкротства, оставшиеся долги по кредитам могут быть списаны в порядке, предусмотренном законом. Исключение: алименты, возмещение вреда здоровью.', sort_order: 4 },
  { question: 'Сколько длится процедура?', answer: 'Сроки зависят от конкретных обстоятельств дела. На продолжительность влияют количество кредиторов, объём документации и другие факторы.', sort_order: 5 },
  { question: 'Сколько стоит сопровождение?', answer: 'Стоимость юридического сопровождения зависит от сложности дела и объёма работ. На бесплатной первичной консультации мы обсудим вашу ситуацию.', sort_order: 6 },
  { question: 'Можно ли пройти процедуру, если официально работаешь?', answer: 'Да, наличие официального трудоустройства не является препятствием для банкротства. Более того, стабильный доход может быть учтён при оценке перспектив дела.', sort_order: 7 },
];

const defaultCases = [
  { title: 'Три кредита и микрозайм', situation: 'Женщина 38 лет, один воспитывает ребёнка. Три потребительских кредита и микрозайм. Общая сумма задолженности — более 2 млн рублей.', problem: 'Ежемесячные платежи превышали доход в два раза. Начались просрочки, звонки от коллекторов.', solution: 'Проведена оценка перспектив, подготовлены документы, подано заявление на банкротство, сопровождение в суде.', result: 'Процедура завершена. Долги списаны в установленном законом порядке.', is_demo: 1 },
  { title: 'Исполнительные производства', situation: 'Мужчина 42 года, работает на заводе. Несколько исполнительных производств, арест зарплатной карты.', problem: 'С зарплаты удерживают максимум по закону, но долги продолжают расти из-за процентов.', solution: 'Проанализированы все исполнительные документы, подготовлены документы для банкротства.', result: 'Банкротство завершено. Исполнительные производства прекращены.', is_demo: 1 },
  { title: 'Трудовой спор: восстановление на работе', situation: 'Женщина 30 лет, работает в организации 5 лет. Уволена по инициативе работодателя без законных оснований.', problem: 'Работодатель отказался выплачивать выходное пособие и не выдал трудовую книжку.', solution: 'Подан иск о восстановлении на работе, взыскании заработной платы за вынужденный прогул и компенсации морального вреда.', result: 'Суд восстановил на работе. Взыскана заработная плата и компенсация.', is_demo: 1 },
];

const defaultReviews = [
  { author_name: 'Елена С.', city: 'Ярославль', text: 'Долго не могла решиться на первый шаг. На консультации мне всё подробно объяснили без давления. Теперь я понимаю, что мою ситуацию можно решить.', rating: 5, date: '2025-03-15', is_demo: 1 },
  { author_name: 'Андрей К.', city: 'Тутаев', text: 'Всё было прозрачно. С самого начала объяснили стоимость, порядок и сроки. Никаких сюрпризов. Рекомендую.', rating: 5, date: '2025-01-20', is_demo: 1 },
  { author_name: 'Мария В.', city: 'Рыбинск', text: 'Меня беспокоило, что всё сложно и непонятно. Но юрист нашёл подходящий язык и помог разобраться. Спасибо за человеческое отношение.', rating: 5, date: '2025-04-10', is_demo: 1 },
];

async function seedDatabase() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const [key, value] of Object.entries(defaultSettings)) {
      await client.query('INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING', [key, value]);
    }

    const expCheck = await client.query('SELECT id FROM expert LIMIT 1');
    if (expCheck.rows.length === 0) {
      await client.query(
        'INSERT INTO expert (name, role, photo_url, bio, experience, specialization, achievements, stats) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
        ['Профессиональная команда', 'Юристы с опытом в различных отраслях права', 'images/Фото юриста.jpg',
         'Мы специализируемся на банкротстве физических лиц, но также оказываем полный спектр юридических услуг для граждан. Индивидуальный подход к каждому клиенту, честная оценка перспектив и прозрачные условия сотрудничества.', '10+',
         'Банкротство, семейное, трудовое право', '',
         '10+ лет практики, 500+ консультаций, 98% довольных клиентов']
      );
    }

    const cntCheck = await client.query('SELECT id FROM contacts LIMIT 1');
    if (cntCheck.rows.length === 0) {
      await client.query(
        'INSERT INTO contacts (phone, email, telegram, vk, max_url, address, work_hours) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [defaultSettings.phone, defaultSettings.email, defaultSettings.telegram, defaultSettings.vk, defaultSettings.max_url, defaultSettings.address, defaultSettings.work_hours]
      );
    }

    const svcCount = await client.query('SELECT COUNT(*) as c FROM services');
    if (parseInt(svcCount.rows[0].c) === 0) {
      for (const s of defaultServices) {
        await client.query('INSERT INTO services (title, description, icon, sort_order) VALUES ($1,$2,$3,$4)', [s.title, s.description, s.icon, s.sort_order]);
      }
    }

    const advCount = await client.query('SELECT COUNT(*) as c FROM advantages');
    if (parseInt(advCount.rows[0].c) === 0) {
      for (const a of defaultAdvantages) {
        await client.query('INSERT INTO advantages (title, description, icon, sort_order) VALUES ($1,$2,$3,$4)', [a.title, a.description, a.icon, a.sort_order]);
      }
    }

    const stepCount = await client.query('SELECT COUNT(*) as c FROM steps');
    if (parseInt(stepCount.rows[0].c) === 0) {
      for (const s of defaultSteps) {
        await client.query('INSERT INTO steps (number, title, description, sort_order) VALUES ($1,$2,$3,$4)', [s.number, s.title, s.description, s.sort_order]);
      }
    }

    const faqCount = await client.query('SELECT COUNT(*) as c FROM faq');
    if (parseInt(faqCount.rows[0].c) === 0) {
      for (const f of defaultFaq) {
        await client.query('INSERT INTO faq (question, answer, sort_order) VALUES ($1,$2,$3)', [f.question, f.answer, f.sort_order]);
      }
    }

    const caseCount = await client.query('SELECT COUNT(*) as c FROM cases');
    if (parseInt(caseCount.rows[0].c) === 0) {
      for (const c of defaultCases) {
        await client.query('INSERT INTO cases (title, situation, problem, solution, result, is_demo) VALUES ($1,$2,$3,$4,$5,$6)', [c.title, c.situation, c.problem, c.solution, c.result, c.is_demo]);
      }
    }

    const revCount = await client.query('SELECT COUNT(*) as c FROM reviews');
    if (parseInt(revCount.rows[0].c) === 0) {
      for (const r of defaultReviews) {
        await client.query('INSERT INTO reviews (author_name, city, text, rating, date, is_demo) VALUES ($1,$2,$3,$4,$5,$6)', [r.author_name, r.city, r.text, r.rating, r.date, r.is_demo]);
      }
    }

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
