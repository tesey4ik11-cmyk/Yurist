/* ============================================================
   НАРБЕРА — Admin Panel JS (SPA)
   ============================================================ */
(function () {
  'use strict';

  const API = '/api';
  let token = localStorage.getItem('admin_token');
  let currentPage = '';

  // --- API Client ---
  async function api(path, method = 'GET', body = null) {
    const effectiveMethod = method.toUpperCase();
    const isMutation = effectiveMethod === 'PUT' || effectiveMethod === 'DELETE';
    const sendMethod = isMutation ? 'POST' : effectiveMethod;
    const opts = { method: sendMethod, headers: { 'Content-Type': 'application/json' } };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    if (body) {
      const payload = isMutation ? { ...body, _method: effectiveMethod } : body;
      opts.body = JSON.stringify(payload);
    } else if (isMutation) {
      opts.body = JSON.stringify({ _method: effectiveMethod });
    }
    const res = await fetch(`${API}/${path}`, opts);
    if (res.status === 401) { logout(); throw new Error('Сессия истекла'); }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Ошибка сервера');
    return data;
  }

  async function uploadFile(file) {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${API}/admin/upload`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Ошибка загрузки');
    return data;
  }

  // --- Auth ---
  async function login(email, password) {
    const res = await fetch(`${API}/admin/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Ошибка входа');
    token = data.token;
    localStorage.setItem('admin_token', token);
    showAdmin();
  }

  function logout() {
    token = null;
    localStorage.removeItem('admin_token');
    document.getElementById('admin-panel').style.display = 'none';
    document.getElementById('login-screen').style.display = 'flex';
  }

  async function checkAuth() {
    if (!token) { showLogin(); return; }
    try { await api('admin/me'); showAdmin(); }
    catch { showLogin(); }
  }

  function showLogin() {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('admin-panel').style.display = 'none';
  }

  function showAdmin() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('admin-panel').style.display = 'flex';
    handleRoute();
  }

  // --- Toast ---
  function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.style.display = 'block';
    setTimeout(() => t.style.display = 'none', 3000);
  }

  // --- Modal ---
  function openModal(title, bodyHtml, onSave) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHtml;
    document.getElementById('modal-overlay').style.display = 'flex';
    document.getElementById('modal-save').onclick = async () => {
      try { await onSave(); closeModal(); toast('Изменения сохранены'); loadPage(currentPage); }
      catch (e) { toast('Ошибка: ' + e.message); }
    };
  }

  function closeModal() { document.getElementById('modal-overlay').style.display = 'none'; }

  // --- Router ---
  function handleRoute() {
    const hash = location.hash.slice(2) || 'dashboard';
    currentPage = hash;
    document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.page === hash));
    loadPage(hash);
  }

  async function loadPage(page) {
    const c = document.getElementById('page-content');
    c.innerHTML = '<div class="empty-state"><p>Загрузка...</p></div>';
    try {
      switch (page) {
        case 'dashboard': await renderDashboard(c); break;
        case 'hero': await renderSettingsPage(c, 'hero'); break;
        case 'about': await renderSettingsPage(c, 'about'); break;
        case 'services': await renderCrudPage(c, 'services', 'Услуги', serviceFields()); break;
        case 'advantages': await renderCrudPage(c, 'advantages', 'Преимущества', advantageFields()); break;
        case 'expert': await renderExpertPage(c); break;
        case 'steps': await renderCrudPage(c, 'steps', 'Этапы работы', stepFields()); break;
        case 'cases': await renderCrudPage(c, 'cases', 'Кейсы', caseFields()); break;
        case 'reviews': await renderCrudPage(c, 'reviews', 'Отзывы', reviewFields()); break;
        case 'faq': await renderCrudPage(c, 'faq', 'FAQ', faqFields()); break;
        case 'inquiries': await renderInquiriesPage(c); break;
        case 'contacts': await renderContactsPage(c); break;
        case 'seo': await renderSeoPage(c); break;
        case 'settings': await renderSettingsFullPage(c); break;
        default: c.innerHTML = '<div class="empty-state"><p>Страница не найдена</p></div>';
      }
    } catch (e) { c.innerHTML = `<div class="empty-state"><p>Ошибка: ${e.message}</p></div>`; }
  }

  // --- Dashboard ---
  async function renderDashboard(c) {
    const data = await api('admin/dashboard');
    const s = data.stats;
    c.innerHTML = `
      <div class="page-header"><h1>Дашборд</h1></div>
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-value">${s.total_inquiries}</div><div class="stat-label">Всего заявок</div></div>
        <div class="stat-card"><div class="stat-value">${s.new_inquiries}</div><div class="stat-label">Новых заявок</div></div>
        <div class="stat-card"><div class="stat-value">${s.services}</div><div class="stat-label">Услуг</div></div>
        <div class="stat-card"><div class="stat-value">${s.reviews}</div><div class="stat-label">Отзывов</div></div>
      </div>
      <div class="card">
        <div class="card-header"><h3>Последние заявки</h3></div>
        ${data.recent_inquiries.length ? `<div class="table-wrap"><table>
          <tr><th>Дата</th><th>Имя</th><th>Телефон</th><th>Способ</th><th>Статус</th></tr>
          ${data.recent_inquiries.map(i => `<tr>
            <td>${new Date(i.created_at).toLocaleDateString('ru')}</td>
            <td>${esc(i.name)}</td><td>${esc(i.phone)}</td><td>${esc(i.contact_method)}</td>
            <td><span class="badge badge-${statusClass(i.status)}">${statusLabel(i.status)}</span></td>
          </tr>`).join('')}
        </table></div>` : '<div class="empty-state"><p>Пока нет заявок</p></div>'}
      </div>`;
  }

  // --- Settings Pages (Hero, About) ---
  async function renderSettingsPage(c, section) {
    const settings = await api('site');
    const s = settings.settings;
    let fields = [];
    if (section === 'hero') {
      fields = [
        { key: 'hero_badge', label: 'Бейдж', type: 'text' },
        { key: 'hero_title', label: 'Заголовок (HTML)', type: 'textarea' },
        { key: 'hero_subtitle', label: 'Подзаголовок', type: 'textarea' },
        { key: 'hero_button', label: 'Текст кнопки', type: 'text' },
        { key: 'hero_note', label: 'Подпись под кнопкой', type: 'text' },
        { key: 'hero_trust', label: 'Строка доверия', type: 'text' },
        { key: 'hero_image', label: 'URL изображения', type: 'text' },
      ];
    } else {
      fields = [
        { key: 'about_title', label: 'Заголовок', type: 'text' },
        { key: 'about_role', label: 'Должность', type: 'text' },
        { key: 'about_bio', label: 'Описание', type: 'textarea' },
      ];
    }
    c.innerHTML = `
      <div class="page-header"><h1>${section === 'hero' ? 'Первый экран' : 'О компании'}</h1></div>
      <div class="card">
        <form id="settings-form">
          ${fields.map(f => `<div class="form-group"><label>${f.label}</label>${f.type === 'textarea' ? `<textarea data-key="${f.key}">${esc(s[f.key] || '')}</textarea>` : `<input type="text" data-key="${f.key}" value="${esc(s[f.key] || '')}">`}</div>`).join('')}
          <button type="submit" class="btn-primary">Сохранить изменения</button>
        </form>
      </div>`;
    document.getElementById('settings-form').onsubmit = async (e) => {
      e.preventDefault();
      const data = {};
      c.querySelectorAll('[data-key]').forEach(el => data[el.dataset.key] = el.value);
      await api('admin/settings', 'PUT', data);
      toast('Изменения сохранены');
    };
  }

  // --- Generic CRUD Page ---
  function serviceFields() {
    return [
      { key: 'title', label: 'Название', type: 'text' },
      { key: 'description', label: 'Описание', type: 'textarea' },
      { key: 'icon', label: 'Иконка (эмодзи)', type: 'text' },
      { key: 'sort_order', label: 'Порядок', type: 'number' },
      { key: 'active', label: 'Активна', type: 'toggle' },
    ];
  }
  function advantageFields() {
    return [
      { key: 'title', label: 'Название', type: 'text' },
      { key: 'description', label: 'Описание', type: 'textarea' },
      { key: 'icon', label: 'Иконка', type: 'text' },
      { key: 'sort_order', label: 'Порядок', type: 'number' },
      { key: 'active', label: 'Активно', type: 'toggle' },
    ];
  }
  function stepFields() {
    return [
      { key: 'number', label: 'Номер', type: 'number' },
      { key: 'title', label: 'Название', type: 'text' },
      { key: 'description', label: 'Описание', type: 'textarea' },
      { key: 'sort_order', label: 'Порядок', type: 'number' },
      { key: 'active', label: 'Активен', type: 'toggle' },
    ];
  }
  function caseFields() {
    return [
      { key: 'title', label: 'Название', type: 'text' },
      { key: 'situation', label: 'Ситуация', type: 'textarea' },
      { key: 'problem', label: 'Проблема', type: 'textarea' },
      { key: 'solution', label: 'Решение', type: 'textarea' },
      { key: 'result', label: 'Результат', type: 'textarea' },
      { key: 'is_demo', label: 'Демо-материал', type: 'toggle' },
      { key: 'active', label: 'Активен', type: 'toggle' },
    ];
  }
  function reviewFields() {
    return [
      { key: 'author_name', label: 'Имя', type: 'text' },
      { key: 'city', label: 'Город', type: 'text' },
      { key: 'text', label: 'Текст отзыва', type: 'textarea' },
      { key: 'rating', label: 'Рейтинг (1-5)', type: 'number' },
      { key: 'date', label: 'Дата', type: 'text' },
      { key: 'is_demo', label: 'Демо', type: 'toggle' },
      { key: 'published', label: 'Опубликован', type: 'toggle' },
    ];
  }
  function faqFields() {
    return [
      { key: 'question', label: 'Вопрос', type: 'text' },
      { key: 'answer', label: 'Ответ', type: 'textarea' },
      { key: 'sort_order', label: 'Порядок', type: 'number' },
      { key: 'active', label: 'Активен', type: 'toggle' },
    ];
  }

  async function renderCrudPage(c, entity, title, fields) {
    const items = await api(entity === 'services' || entity === 'advantages' || entity === 'steps' || entity === 'cases' || entity === 'reviews' || entity === 'faq' ? entity : entity);
    c.innerHTML = `
      <div class="page-header"><h1>${title}</h1><button class="btn-primary" id="add-btn">+ Добавить</button></div>
      <div class="card">
        ${items.length ? `<div class="table-wrap"><table>
          <tr><th>ID</th>${fields.filter(f => f.type !== 'textarea').map(f => `<th>${f.label}</th>`).join('')}<th>Действия</th></tr>
          ${items.map(item => `<tr>
            <td>${item.id}</td>
            ${fields.filter(f => f.type !== 'textarea').map(f => `<td>${renderTableCell(item, f)}</td>`).join('')}
            <td class="actions">
              <button class="btn-icon edit-btn" data-id="${item.id}" title="Редактировать">✏️</button>
              <button class="btn-icon del-btn" data-id="${item.id}" title="Удалить">🗑️</button>
            </td>
          </tr>`).join('')}
        </table></div>` : '<div class="empty-state"><p>Пока нет записей</p><button class="btn-primary" id="add-btn-empty">Добавить первую</button></div>'}
      </div>`;

    const addBtn = document.getElementById('add-btn') || document.getElementById('add-btn-empty');
    if (addBtn) addBtn.onclick = () => openModal(`Добавить: ${title}`, buildForm(fields, {}), async () => {
      const data = collectForm(fields);
      await api(entity, 'POST', data);
    });

    c.querySelectorAll('.edit-btn').forEach(btn => {
      btn.onclick = () => {
        const item = items.find(i => i.id == btn.dataset.id);
        openModal(`Редактировать: ${title}`, buildForm(fields, item), async () => {
          const data = collectForm(fields);
          await api(`${entity}/${btn.dataset.id}`, 'PUT', data);
        });
      };
    });

    c.querySelectorAll('.del-btn').forEach(btn => {
      btn.onclick = async () => {
        if (!confirm('Удалить запись?')) return;
        await api(`${entity}/${btn.dataset.id}`, 'DELETE');
        toast('Запись удалена');
        loadPage(currentPage);
      };
    });
  }

  function renderTableCell(item, field) {
    const val = item[field.key];
    if (field.type === 'toggle') return val ? '<span class="badge badge-active">Да</span>' : '<span class="badge badge-hidden">Нет</span>';
    if (field.key === 'is_demo') return val ? '<span class="badge badge-demo">Демо</span>' : '<span class="badge badge-active">Реальный</span>';
    if (field.key === 'rating') return '★'.repeat(val || 0);
    return esc(String(val || '').slice(0, 60));
  }

  function buildForm(fields, item) {
    return `<form id="modal-form">${fields.map(f => {
      const val = item[f.key] || '';
      if (f.type === 'toggle') return `<div class="form-group"><label>${f.label}</label><label class="toggle"><input type="checkbox" data-key="${f.key}" ${val ? 'checked' : ''}><span class="toggle-slider"></span></label></div>`;
      if (f.type === 'textarea') return `<div class="form-group"><label>${f.label}</label><textarea data-key="${f.key}">${esc(val)}</textarea></div>`;
      if (f.type === 'number') return `<div class="form-group"><label>${f.label}</label><input type="number" data-key="${f.key}" value="${esc(val)}"></div>`;
      return `<div class="form-group"><label>${f.label}</label><input type="text" data-key="${f.key}" value="${esc(val)}"></div>`;
    }).join('')}</form>`;
  }

  function collectForm(fields) {
    const data = {};
    fields.forEach(f => {
      if (f.type === 'toggle') {
        const el = document.querySelector(`[data-key="${f.key}"]`);
        data[f.key] = el && el.checked ? 1 : 0;
      } else {
        const el = document.querySelector(`[data-key="${f.key}"]`);
        data[f.key] = el ? el.value : '';
      }
    });
    return data;
  }

  // --- Expert Page ---
  async function renderExpertPage(c) {
    const expert = await api('admin/expert');
    c.innerHTML = `
      <div class="page-header"><h1>Эксперт</h1></div>
      <div class="card">
        <form id="expert-form">
          <div class="form-row">
            <div class="form-group"><label>Имя</label><input type="text" id="exp-name" value="${esc(expert.name || '')}"></div>
            <div class="form-group"><label>Должность</label><input type="text" id="exp-role" value="${esc(expert.role || '')}"></div>
          </div>
          <div class="form-group"><label>Фото (URL)</label><input type="text" id="exp-photo" value="${esc(expert.photo_url || '')}"></div>
          <div class="form-group"><label>Описание</label><textarea id="exp-bio">${esc(expert.bio || '')}</textarea></div>
          <div class="form-row">
            <div class="form-group"><label>Опыт</label><input type="text" id="exp-exp" value="${esc(expert.experience || '')}"></div>
            <div class="form-group"><label>Специализация</label><input type="text" id="exp-spec" value="${esc(expert.specialization || '')}"></div>
          </div>
          <div class="form-group"><label>Достижения</label><textarea id="exp-ach">${esc(expert.achievements || '')}</textarea></div>
          <div class="form-group"><label>Статистика (JSON)</label><textarea id="exp-stats">${esc(expert.stats || '[]')}</textarea></div>
          <button type="submit" class="btn-primary">Сохранить</button>
        </form>
      </div>`;
    document.getElementById('expert-form').onsubmit = async (e) => {
      e.preventDefault();
      await api('admin/expert', 'PUT', {
        name: document.getElementById('exp-name').value,
        role: document.getElementById('exp-role').value,
        photo_url: document.getElementById('exp-photo').value,
        bio: document.getElementById('exp-bio').value,
        experience: document.getElementById('exp-exp').value,
        specialization: document.getElementById('exp-spec').value,
        achievements: document.getElementById('exp-ach').value,
        stats: document.getElementById('exp-stats').value,
      });
      toast('Изменения сохранены');
    };
  }

  // --- Contacts Page ---
  async function renderContactsPage(c) {
    const contacts = await api('admin/contacts');
    c.innerHTML = `
      <div class="page-header"><h1>Контакты</h1></div>
      <div class="card">
        <form id="contacts-form">
          <div class="form-row">
            <div class="form-group"><label>Телефон</label><input type="text" id="c-phone" value="${esc(contacts.phone || '')}"></div>
            <div class="form-group"><label>Email</label><input type="text" id="c-email" value="${esc(contacts.email || '')}"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Telegram URL</label><input type="text" id="c-tg" value="${esc(contacts.telegram || '')}"></div>
            <div class="form-group"><label>VK URL</label><input type="text" id="c-vk" value="${esc(contacts.vk || '')}"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>MAX URL</label><input type="text" id="c-max" value="${esc(contacts.max_url || '')}"></div>
            <div class="form-group"><label>Часы работы</label><input type="text" id="c-hours" value="${esc(contacts.work_hours || '')}"></div>
          </div>
          <div class="form-group"><label>Адрес</label><input type="text" id="c-addr" value="${esc(contacts.address || '')}"></div>
          <div class="form-group"><label>Ссылка на карту</label><input type="text" id="c-map" value="${esc(contacts.map_url || '')}"></div>
          <button type="submit" class="btn-primary">Сохранить</button>
        </form>
      </div>`;
    document.getElementById('contacts-form').onsubmit = async (e) => {
      e.preventDefault();
      await api('admin/contacts', 'PUT', {
        phone: document.getElementById('c-phone').value,
        email: document.getElementById('c-email').value,
        telegram: document.getElementById('c-tg').value,
        vk: document.getElementById('c-vk').value,
        max_url: document.getElementById('c-max').value,
        work_hours: document.getElementById('c-hours').value,
        address: document.getElementById('c-addr').value,
        map_url: document.getElementById('c-map').value,
      });
      toast('Контакты сохранены');
    };
  }

  // --- SEO Page ---
  async function renderSeoPage(c) {
    const seo = await api('admin/seo');
    c.innerHTML = `
      <div class="page-header"><h1>SEO</h1></div>
      <div class="card">
        <form id="seo-form">
          <div class="form-group"><label>Title</label><input type="text" id="s-title" value="${esc(seo.title || '')}"></div>
          <div class="form-group"><label>Description</label><textarea id="s-desc">${esc(seo.description || '')}</textarea></div>
          <div class="form-row">
            <div class="form-group"><label>OG Title</label><input type="text" id="s-ogt" value="${esc(seo.og_title || '')}"></div>
            <div class="form-group"><label>OG Description</label><input type="text" id="s-ogd" value="${esc(seo.og_description || '')}"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>OG Image URL</label><input type="text" id="s-ogi" value="${esc(seo.og_image || '')}"></div>
            <div class="form-group"><label>Favicon URL</label><input type="text" id="s-fav" value="${esc(seo.favicon || '')}"></div>
          </div>
          <div class="form-group"><label>Canonical URL</label><input type="text" id="s-can" value="${esc(seo.canonical || '')}"></div>
          <button type="submit" class="btn-primary">Сохранить</button>
        </form>
      </div>
      <div class="card">
        <h3 style="margin-bottom:12px">Предпросмотр</h3>
        <div style="background:var(--bg);padding:16px;border-radius:8px">
          <div id="seo-preview-title" style="color:#1a0dab;font-size:1.125rem;font-weight:600;margin-bottom:4px"></div>
          <div id="seo-preview-url" style="color:#006621;font-size:0.8125rem;margin-bottom:4px"></div>
          <div id="seo-preview-desc" style="color:#545454;font-size:0.875rem"></div>
        </div>
      </div>`;
    const updatePreview = () => {
      document.getElementById('seo-preview-title').textContent = document.getElementById('s-title').value || 'Заголовок страницы';
      document.getElementById('seo-preview-url').textContent = document.getElementById('s-can').value || 'https://narbera.ru/';
      document.getElementById('seo-preview-desc').textContent = document.getElementById('s-desc').value || 'Описание страницы';
    };
    ['s-title', 's-desc', 's-can'].forEach(id => document.getElementById(id).addEventListener('input', updatePreview));
    updatePreview();
    document.getElementById('seo-form').onsubmit = async (e) => {
      e.preventDefault();
      await api('admin/seo', 'PUT', {
        title: document.getElementById('s-title').value,
        description: document.getElementById('s-desc').value,
        og_title: document.getElementById('s-ogt').value,
        og_description: document.getElementById('s-ogd').value,
        og_image: document.getElementById('s-ogi').value,
        favicon: document.getElementById('s-fav').value,
        canonical: document.getElementById('s-can').value,
      });
      toast('SEO сохранено');
    };
  }

  // --- Settings Full Page ---
  async function renderSettingsFullPage(c) {
    const settings = await api('site');
    const s = settings.settings;
    c.innerHTML = `
      <div class="page-header"><h1>Настройки сайта</h1></div>
      <div class="card">
        <form id="full-settings-form">
          <h3 style="margin-bottom:16px">Основное</h3>
          <div class="form-row">
            <div class="form-group"><label>Название компании</label><input type="text" data-key="company_name" value="${esc(s.company_name || '')}"></div>
            <div class="form-group"><label>Краткое название</label><input type="text" data-key="company_short" value="${esc(s.company_short || '')}"></div>
          </div>
          <div class="form-group"><label>Девиз</label><input type="text" data-key="motto" value="${esc(s.motto || '')}"></div>
          <div class="form-row">
            <div class="form-group"><label>Город</label><input type="text" data-key="city" value="${esc(s.city || '')}"></div>
            <div class="form-group"><label>Регион</label><input type="text" data-key="region" value="${esc(s.region || '')}"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Телефон</label><input type="text" data-key="phone" value="${esc(s.phone || '')}"></div>
            <div class="form-group"><label>Email</label><input type="text" data-key="email" value="${esc(s.email || '')}"></div>
          </div>
          <div class="form-group"><label>Адрес</label><input type="text" data-key="address" value="${esc(s.address || '')}"></div>
          <div class="form-row">
            <div class="form-group"><label>Часы работы</label><input type="text" data-key="work_hours" value="${esc(s.work_hours || '')}"></div>
            <div class="form-group"><label>Год основания</label><input type="text" data-key="founded_year" value="${esc(s.founded_year || '')}"></div>
          </div>

          <h3 style="margin:24px 0 16px">Социальные сети</h3>
          <div class="form-row">
            <div class="form-group"><label>Telegram</label><input type="text" data-key="telegram" value="${esc(s.telegram || '')}"></div>
            <div class="form-group"><label>VK</label><input type="text" data-key="vk" value="${esc(s.vk || '')}"></div>
          </div>
          <div class="form-group"><label>MAX</label><input type="text" data-key="max_url" value="${esc(s.max_url || '')}"></div>

          <h3 style="margin:24px 0 16px">Отображение</h3>
          <div class="form-row" style="grid-template-columns:repeat(3,1fr)">
            ${['show_reviews','show_cases','show_faq','show_social','show_mobile_bar','show_prices'].map(k => `
              <div class="form-group"><label>${{
                show_reviews: 'Отзывы', show_cases: 'Кейсы', show_faq: 'FAQ',
                show_social: 'Соцсети', show_mobile_bar: 'Мобильная панель', show_prices: 'Цены'
              }[k]}</label><label class="toggle"><input type="checkbox" data-key="${k}" ${s[k] === '1' ? 'checked' : ''}><span class="toggle-slider"></span></label></div>
            `).join('')}
          </div>

          <h3 style="margin:24px 0 16px">Дизайн</h3>
          <div class="form-row">
            <div class="form-group"><label>Основной цвет</label><input type="color" data-key="primary_color" value="${esc(s.primary_color || '#b8944f')}"></div>
            <div class="form-group"><label>Доп. цвет</label><input type="color" data-key="secondary_color" value="${esc(s.secondary_color || '#0c1222')}"></div>
          </div>

          <button type="submit" class="btn-primary" style="margin-top:24px">Сохранить изменения</button>
        </form>
      </div>`;

    document.getElementById('full-settings-form').onsubmit = async (e) => {
      e.preventDefault();
      const data = {};
      c.querySelectorAll('[data-key]').forEach(el => {
        if (el.type === 'checkbox') data[el.dataset.key] = el.checked ? '1' : '0';
        else data[el.dataset.key] = el.value;
      });
      await api('admin/settings', 'PUT', data);
      toast('Настройки сохранены');
    };
  }

  // --- Inquiries Page ---
  async function renderInquiriesPage(c) {
    const items = await api('admin/inquiries');
    c.innerHTML = `
      <div class="page-header"><h1>Заявки</h1></div>
      <div class="card">
        ${items.length ? `<div class="table-wrap"><table>
          <tr><th>ID</th><th>Дата</th><th>Имя</th><th>Телефон</th><th>Способ</th><th>Сообщение</th><th>Статус</th><th>Действия</th></tr>
          ${items.map(i => `<tr>
            <td>${i.id}</td>
            <td>${new Date(i.created_at).toLocaleDateString('ru')}</td>
            <td>${esc(i.name)}</td><td>${esc(i.phone)}</td><td>${esc(i.contact_method)}</td>
            <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(i.message)}">${esc(i.message)}</td>
            <td>
              <select class="status-select" data-id="${i.id}" style="padding:4px 8px;border:1px solid var(--border);border-radius:6px;font-size:0.8125rem">
                <option value="new" ${i.status==='new'?'selected':''}>Новая</option>
                <option value="in_progress" ${i.status==='in_progress'?'selected':''}>В работе</option>
                <option value="completed" ${i.status==='completed'?'selected':''}>Завершена</option>
                <option value="archive" ${i.status==='archive'?'selected':''}>Архив</option>
              </select>
            </td>
            <td><button class="btn-icon del-inq" data-id="${i.id}" title="Удалить">🗑️</button></td>
          </tr>`).join('')}
        </table></div>` : '<div class="empty-state"><p>Пока нет заявок</p></div>'}
      </div>`;

    c.querySelectorAll('.status-select').forEach(sel => {
      sel.onchange = async () => {
        await api(`admin/inquiries/${sel.dataset.id}`, 'PUT', { status: sel.value });
        toast('Статус обновлён');
      };
    });
    c.querySelectorAll('.del-inq').forEach(btn => {
      btn.onclick = async () => {
        if (!confirm('Удалить заявку?')) return;
        await api(`admin/inquiries/${btn.dataset.id}`, 'DELETE');
        toast('Заявка удалена');
        loadPage(currentPage);
      };
    });
  }

  // --- Helpers ---
  function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
  function statusClass(s) { return { new: 'new', in_progress: 'progress', completed: 'done', archive: 'archive' }[s] || 'new'; }
  function statusLabel(s) { return { new: 'Новая', in_progress: 'В работе', completed: 'Завершена', archive: 'Архив' }[s] || s; }

  // --- Init ---
  document.getElementById('login-form').onsubmit = async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('login-error');
    errEl.style.display = 'none';
    try {
      await login(document.getElementById('login-email').value, document.getElementById('login-password').value);
    } catch (e) {
      errEl.textContent = e.message;
      errEl.style.display = 'block';
    }
  };

  document.getElementById('logout-btn').onclick = (e) => { e.preventDefault(); logout(); };
  document.getElementById('menu-toggle').onclick = () => document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebar-close').onclick = () => document.getElementById('sidebar').classList.remove('open');
  document.getElementById('modal-close').onclick = closeModal;
  document.getElementById('modal-cancel').onclick = closeModal;
  document.getElementById('modal-overlay').onclick = (e) => { if (e.target === e.currentTarget) closeModal(); };

  window.addEventListener('hashchange', handleRoute);
  checkAuth();
})();
