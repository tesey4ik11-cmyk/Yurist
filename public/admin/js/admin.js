(function () {
  'use strict';

  const API = '/api';
  let token = localStorage.getItem('admin_token');
  let currentPage = '';
  let currentData = {};
  let isDirty = false;

  // ===== API CLIENT =====
  async function api(path, method = 'GET', body = null) {
    const isMutation = method === 'PUT' || method === 'DELETE';
    const sendMethod = isMutation ? 'POST' : method;
    const opts = { method: sendMethod, headers: {} };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    if (body && method !== 'GET') {
      const payload = isMutation ? { ...body, _method: method } : body;
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(payload);
    }
    const res = await fetch(`${API}/${path}`, opts);
    if (res.status === 401) { logout(); throw new Error('Сессия истекла'); }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Ошибка сервера');
    return data;
  }

  async function uploadImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const data = await api('admin/upload', 'POST', { data: reader.result, filename: file.name });
          resolve(data.url);
        } catch (e) { reject(e); }
      };
      reader.onerror = () => reject(new Error('Ошибка чтения файла'));
      reader.readAsDataURL(file);
    });
  }

  // ===== AUTH =====
  async function login(email, password) {
    const res = await fetch(`${API}/admin/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
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
    try { await api('admin/me'); showAdmin(); } catch { showLogin(); }
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

  // ===== TOAST =====
  function toast(msg, isError) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.style.background = isError ? 'var(--a-danger)' : 'var(--a-success)';
    t.style.display = 'block';
    setTimeout(() => t.style.display = 'none', 3000);
  }

  // ===== MODAL =====
  function openModal(title, bodyHtml, onSave) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHtml;
    document.getElementById('modal-overlay').style.display = 'flex';
    document.getElementById('modal-save').onclick = async () => {
      try { await onSave(); closeModal(); toast('Сохранено'); loadPage(currentPage); }
      catch (e) { toast('Ошибка: ' + e.message, true); }
    };
  }

  function closeModal() { document.getElementById('modal-overlay').style.display = 'none'; }

  // ===== ROUTER =====
  function handleRoute() {
    const hash = location.hash.slice(2) || 'dashboard';
    currentPage = hash;
    document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.page === hash));
    const saveBtn = document.getElementById('save-btn');
    const titleMap = {
      dashboard: 'Дашборд', editor: 'Редактор сайта', inquiries: 'Заявки',
      's-hero': 'Первый экран', 's-about': 'О компании', 's-services': 'Услуги',
      's-expert': 'Эксперт', 's-steps': 'Этапы', 's-why': 'Кому нужна помощь',
      's-cases': 'Кейсы', 's-reviews': 'Отзывы', 's-faq': 'FAQ',
      's-contacts': 'Контакты', 's-seo': 'SEO', 's-settings': 'Общие настройки',
    };
    document.getElementById('topbar-title').textContent = titleMap[hash] || hash;
    saveBtn.style.display = (hash !== 'dashboard' && hash !== 'inquiries' && hash !== 'editor') ? 'inline-flex' : 'none';
    isDirty = false;
    loadPage(hash);
  }

  async function loadPage(page) {
    const c = document.getElementById('page-content');
    c.innerHTML = '<div class="empty-state"><p>Загрузка...</p></div>';
    try {
      if (page === 'dashboard') return await renderDashboard(c);
      if (page === 'inquiries') return await renderInquiriesPage(c);
      if (page === 'editor') return await renderEditor(c);
      if (page.startsWith('s-')) return await renderSectionEditor(c, page.slice(2));
      c.innerHTML = '<div class="empty-state"><p>Страница не найдена</p></div>';
    } catch (e) { c.innerHTML = `<div class="empty-state"><p>Ошибка: ${e.message}</p></div>`; }
  }

  // ===== DASHBOARD =====
  async function renderDashboard(c) {
    const data = await api('admin/dashboard');
    const s = data.stats;
    c.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-value">${s.total_inquiries}</div><div class="stat-label">Всего заявок</div></div>
        <div class="stat-card"><div class="stat-value">${s.new_inquiries}</div><div class="stat-label">Новых</div></div>
        <div class="stat-card"><div class="stat-value">${s.services}</div><div class="stat-label">Услуг</div></div>
        <div class="stat-card"><div class="stat-value">${s.reviews}</div><div class="stat-label">Отзывов</div></div>
      </div>
      <div class="card">
        <div class="card-header"><h3>Последние заявки</h3></div>
        ${data.recent_inquiries.length ? `<div class="table-wrap"><table>
          <tr><th>Дата</th><th>Имя</th><th>Телефон</th><th>Способ</th><th>Статус</th></tr>
          ${data.recent_inquiries.map(i => `<tr>
            <td>${new Date(i.created_at).toLocaleDateString('ru')}</td>
            <td>${esc(i.name)}</td><td>${esc(i.phone)}</td><td>${esc(i.contact_method || '')}</td>
            <td><span class="badge badge-${statusClass(i.status)}">${statusLabel(i.status)}</span></td>
          </tr>`).join('')}
        </table></div>` : '<div class="empty-state"><p>Пока нет заявок</p></div>'}
      </div>`;
  }

  // ===== INQUIRIES =====
  async function renderInquiriesPage(c) {
    const items = await api('admin/inquiries');
    c.innerHTML = `
      <div class="card">
        ${items.length ? `<div class="table-wrap"><table>
          <tr><th>ID</th><th>Дата</th><th>Имя</th><th>Телефон</th><th>Способ</th><th>Сообщение</th><th>Статус</th><th></th></tr>
          ${items.map(i => `<tr>
            <td>${i.id}</td>
            <td>${new Date(i.created_at).toLocaleDateString('ru')}</td>
            <td>${esc(i.name)}</td><td>${esc(i.phone)}</td><td>${esc(i.contact_method || '')}</td>
            <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(i.message)}">${esc(i.message)}</td>
            <td>
              <select class="status-select" data-id="${i.id}">
                <option value="new" ${i.status==='new'?'selected':''}>Новая</option>
                <option value="in_progress" ${i.status==='in_progress'?'selected':''}>В работе</option>
                <option value="completed" ${i.status==='completed'?'selected':''}>Завершена</option>
                <option value="archive" ${i.status==='archive'?'selected':''}>Архив</option>
              </select>
            </td>
            <td><button class="btn-danger btn-sm del-inq" data-id="${i.id}">Удалить</button></td>
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
        toast('Удалено');
        renderInquiriesPage(c);
      };
    });
  }

  // ===== VISUAL EDITOR (split panel) =====
  async function renderEditor(c) {
    c.innerHTML = `
      <div class="editor-layout">
        <div class="editor-form-panel" id="editor-form">
          <div class="section-tabs" id="editor-tabs"></div>
          <div id="editor-fields"></div>
        </div>
        <div class="editor-preview-panel">
          <div class="preview-label">Предпросмотр</div>
          <iframe id="preview-frame" src="/"></iframe>
        </div>
      </div>`;

    const tabs = document.getElementById('editor-tabs');
    const sections = [
      { id: 'hero', label: 'Главный экран' },
      { id: 'about', label: 'О нас' },
      { id: 'services', label: 'Услуги' },
      { id: 'expert', label: 'Эксперт' },
      { id: 'steps', label: 'Этапы' },
      { id: 'cases', label: 'Кейсы' },
      { id: 'reviews', label: 'Отзывы' },
      { id: 'faq', label: 'FAQ' },
      { id: 'contacts', label: 'Контакты' },
      { id: 'seo', label: 'SEO' },
    ];

    tabs.innerHTML = sections.map((s, i) =>
      `<button class="section-tab${i === 0 ? ' active' : ''}" data-section="${s.id}">${s.label}</button>`
    ).join('');

    tabs.querySelectorAll('.section-tab').forEach(tab => {
      tab.onclick = () => {
        tabs.querySelectorAll('.section-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        loadEditorSection(tab.dataset.section);
      };
    });

    loadEditorSection('hero');
  }

  async function loadEditorSection(section) {
    const container = document.getElementById('editor-fields');
    container.innerHTML = '<div class="empty-state"><p>Загрузка...</p></div>';
    try {
      if (['services', 'cases', 'reviews', 'faq'].includes(section)) {
        await renderCrudEditor(container, section);
      } else if (section === 'expert') {
        await renderExpertEditor(container);
      } else if (section === 'contacts') {
        await renderContactsEditor(container);
      } else if (section === 'seo') {
        await renderSeoEditor(container);
      } else {
        await renderSettingsEditor(container, section);
      }
    } catch (e) {
      container.innerHTML = `<div class="empty-state"><p>Ошибка: ${e.message}</p></div>`;
    }
  }

  // ===== SECTION EDITORS =====
  const sectionFields = {
    hero: [
      { key: 'hero_badge', label: 'Бейдж', type: 'text' },
      { key: 'hero_title', label: 'Заголовок', type: 'text' },
      { key: 'hero_subtitle', label: 'Подзаголовок', type: 'textarea' },
      { key: 'hero_button', label: 'Текст кнопки', type: 'text' },
      { key: 'hero_note', label: 'Подпись под кнопкой', type: 'text' },
      { key: 'hero_trust', label: 'Доверие', type: 'text' },
      { key: 'hero_image', label: 'Фото', type: 'image' },
    ],
    about: [
      { key: 'about_title', label: 'Заголовок', type: 'text' },
      { key: 'about_role', label: 'Должность', type: 'text' },
      { key: 'about_bio', label: 'Описание', type: 'textarea' },
    ],
    services: [],
    expert: [],
    steps: [],
    cases: [],
    reviews: [],
    faq: [],
    contacts: [],
    seo: [],
  };

  async function renderSettingsEditor(c, section) {
    const settings = await api('admin/settings');
    const fields = sectionFields[section] || [];
    c.innerHTML = `
      <div class="card">
        <h3 style="margin-bottom:16px">${section === 'hero' ? 'Первый экран' : 'О компании'}</h3>
        <form id="section-form">
          ${fields.map(f => renderFormField(f, settings[f.key] || '')).join('')}
          <button type="submit" class="btn-primary">Сохранить</button>
        </form>
      </div>`;
    setupFormHandlers(c, settings);
  }

  async function renderExpertEditor(c) {
    const expert = await api('admin/expert');
    c.innerHTML = `
      <div class="card">
        <h3 style="margin-bottom:16px">Эксперт</h3>
        <form id="section-form">
          <div class="form-row">
            <div class="form-group"><label>Имя</label><input type="text" data-key="name" value="${esc(expert.name || '')}"></div>
            <div class="form-group"><label>Должность</label><input type="text" data-key="role" value="${esc(expert.role || '')}"></div>
          </div>
          <div class="form-group">
            <label>Фото</label>
            <div class="image-upload" id="expert-photo-upload">
              <input type="file" accept="image/*" id="expert-photo-input">
              ${expert.photo_url ? `<img src="${esc(expert.photo_url)}" class="image-preview">` : '<div class="image-upload-text">Нажмите или перетащите фото</div>'}
            </div>
            <input type="hidden" data-key="photo_url" value="${esc(expert.photo_url || '')}">
          </div>
          <div class="form-group"><label>Описание</label><textarea data-key="bio" rows="4">${esc(expert.bio || '')}</textarea></div>
          <div class="form-row">
            <div class="form-group"><label>Опыт</label><input type="text" data-key="experience" value="${esc(expert.experience || '')}"></div>
            <div class="form-group"><label>Специализация</label><input type="text" data-key="specialization" value="${esc(expert.specialization || '')}"></div>
          </div>
          <div class="form-group"><label>Достижения</label><textarea data-key="achievements" rows="3">${esc(expert.achievements || '')}</textarea></div>
          <div class="form-group"><label>Статистика (через запятую: 10+ лет практики, 500+ консультаций)</label><input type="text" data-key="stats" value="${esc(expert.stats || '')}"></div>
          <button type="submit" class="btn-primary">Сохранить</button>
        </form>
      </div>`;
    setupFormHandlers(c, expert);
    setupImageUpload(c, 'expert-photo-input', 'expert-photo-upload', '[data-key="photo_url"]');
  }

  async function renderContactsEditor(c) {
    const contacts = await api('admin/contacts');
    c.innerHTML = `
      <div class="card">
        <h3 style="margin-bottom:16px">Контакты</h3>
        <form id="section-form">
          <div class="form-row">
            <div class="form-group"><label>Телефон</label><input type="text" data-key="phone" value="${esc(contacts.phone || '')}"></div>
            <div class="form-group"><label>Email</label><input type="text" data-key="email" value="${esc(contacts.email || '')}"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Telegram</label><input type="text" data-key="telegram" value="${esc(contacts.telegram || '')}"></div>
            <div class="form-group"><label>VK</label><input type="text" data-key="vk" value="${esc(contacts.vk || '')}"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>MAX</label><input type="text" data-key="max_url" value="${esc(contacts.max_url || '')}"></div>
            <div class="form-group"><label>Часы работы</label><input type="text" data-key="work_hours" value="${esc(contacts.work_hours || '')}"></div>
          </div>
          <div class="form-group"><label>Адрес</label><input type="text" data-key="address" value="${esc(contacts.address || '')}"></div>
          <div class="form-group"><label>Карта (iframe src)</label><input type="text" data-key="map_url" value="${esc(contacts.map_url || '')}"></div>
          <button type="submit" class="btn-primary">Сохранить</button>
        </form>
      </div>`;
    setupFormHandlers(c, contacts);
  }

  async function renderSeoEditor(c) {
    const seo = await api('admin/seo');
    c.innerHTML = `
      <div class="card">
        <h3 style="margin-bottom:16px">SEO</h3>
        <form id="section-form">
          <div class="form-group"><label>Title</label><input type="text" data-key="title" value="${esc(seo.title || '')}"></div>
          <div class="form-group"><label>Description</label><textarea data-key="description" rows="3">${esc(seo.description || '')}</textarea></div>
          <div class="form-group"><label>Keywords</label><input type="text" data-key="keywords" value="${esc(seo.keywords || '')}"></div>
          <div class="form-row">
            <div class="form-group"><label>OG Title</label><input type="text" data-key="og_title" value="${esc(seo.og_title || '')}"></div>
            <div class="form-group"><label>OG Description</label><input type="text" data-key="og_description" value="${esc(seo.og_description || '')}"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>OG Image</label><input type="text" data-key="og_image" value="${esc(seo.og_image || '')}"></div>
            <div class="form-group"><label>Canonical URL</label><input type="text" data-key="canonical" value="${esc(seo.canonical || '')}"></div>
          </div>
          <button type="submit" class="btn-primary">Сохранить</button>
        </form>
      </div>`;
    setupFormHandlers(c, seo);
  }

  // ===== CRUD EDITOR (services, cases, reviews, faq) =====
  const crudFieldDefs = {
    services: [
      { key: 'title', label: 'Название', type: 'text' },
      { key: 'description', label: 'Описание', type: 'textarea' },
      { key: 'icon', label: 'Иконка', type: 'text' },
      { key: 'sort_order', label: 'Порядок', type: 'number' },
      { key: 'active', label: 'Активна', type: 'toggle' },
    ],
    cases: [
      { key: 'title', label: 'Название', type: 'text' },
      { key: 'situation', label: 'Ситуация', type: 'textarea' },
      { key: 'problem', label: 'Проблема', type: 'textarea' },
      { key: 'solution', label: 'Что сделано', type: 'textarea' },
      { key: 'result', label: 'Результат', type: 'textarea' },
      { key: 'is_demo', label: 'Демо', type: 'toggle' },
      { key: 'active', label: 'Активен', type: 'toggle' },
    ],
    reviews: [
      { key: 'author_name', label: 'Имя автора', type: 'text' },
      { key: 'city', label: 'Город', type: 'text' },
      { key: 'text', label: 'Текст отзыва', type: 'textarea' },
      { key: 'rating', label: 'Рейтинг (1-5)', type: 'number' },
      { key: 'date', label: 'Дата', type: 'text' },
      { key: 'is_demo', label: 'Демо', type: 'toggle' },
      { key: 'published', label: 'Опубликован', type: 'toggle' },
    ],
    faq: [
      { key: 'question', label: 'Вопрос', type: 'text' },
      { key: 'answer', label: 'Ответ', type: 'textarea' },
      { key: 'sort_order', label: 'Порядок', type: 'number' },
      { key: 'active', label: 'Активен', type: 'toggle' },
    ],
  };

  const crudTitles = { services: 'Услуги', cases: 'Кейсы', reviews: 'Отзывы', faq: 'FAQ' };

  async function renderCrudEditor(c, entity) {
    const items = await api(entity);
    const fields = crudFieldDefs[entity];
    c.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3>${crudTitles[entity]}</h3>
          <button class="btn-add" id="crud-add">+ Добавить</button>
        </div>
        ${items.length ? items.map(item => `
          <div class="edit-card">
            <div class="edit-card-header">
              <span class="edit-card-title">${esc(String(item.title || item.question || item.author_name || `#${item.id}`))}</span>
              <div class="edit-card-actions">
                <button class="btn-outline btn-sm crud-edit" data-id="${item.id}">Ред.</button>
                <button class="btn-danger btn-sm crud-del" data-id="${item.id}">Удал.</button>
              </div>
            </div>
            ${fields.filter(f => f.type === 'textarea').map(f =>
              `<div style="font-size:12px;color:var(--a-text-dim);margin-bottom:4px"><strong>${f.label}:</strong> ${esc(String(item[f.key] || '').slice(0, 120))}${String(item[f.key] || '').length > 120 ? '...' : ''}</div>`
            ).join('')}
            <div style="display:flex;gap:6px;margin-top:4px">
              ${fields.filter(f => f.type === 'toggle').map(f =>
                `<span class="badge ${item[f.key] ? 'badge-active' : 'badge-hidden'}">${f.label}: ${item[f.key] ? 'Да' : 'Нет'}</span>`
              ).join('')}
            </div>
          </div>
        `).join('') : '<div class="empty-state"><p>Пока нет записей</p></div>'}
      </div>`;

    document.getElementById('crud-add').onclick = () => {
      openModal(`Добавить: ${crudTitles[entity]}`, buildCrudForm(fields, {}), async () => {
        const data = collectCrudForm(fields);
        await api(entity, 'POST', data);
      });
    };

    c.querySelectorAll('.crud-edit').forEach(btn => {
      btn.onclick = () => {
        const item = items.find(i => i.id == btn.dataset.id);
        openModal(`Редактировать: ${crudTitles[entity]}`, buildCrudForm(fields, item), async () => {
          const data = collectCrudForm(fields);
          await api(`${entity}/${btn.dataset.id}`, 'PUT', data);
        });
      };
    });

    c.querySelectorAll('.crud-del').forEach(btn => {
      btn.onclick = async () => {
        if (!confirm('Удалить запись?')) return;
        await api(`${entity}/${btn.dataset.id}`, 'DELETE');
        toast('Удалено');
        renderCrudEditor(c, entity);
      };
    });
  }

  function buildCrudForm(fields, item) {
    return `<form id="modal-form">${fields.map(f => renderFormField(f, item[f.key] || '')).join('')}</form>`;
  }

  function collectCrudForm(fields) {
    const data = {};
    const form = document.getElementById('modal-form');
    fields.forEach(f => {
      if (f.type === 'toggle') {
        const el = form.querySelector(`[data-key="${f.key}"]`);
        data[f.key] = el && el.checked ? 1 : 0;
      } else {
        const el = form.querySelector(`[data-key="${f.key}"]`);
        data[f.key] = el ? el.value : '';
      }
    });
    return data;
  }

  // ===== FULL SETTINGS PAGE (via s-settings) =====
  async function renderSectionEditor(c, section) {
    if (section === 'settings') {
      const settings = await api('admin/settings');
      c.innerHTML = `
        <div class="card">
          <h3 style="margin-bottom:16px">Общие настройки</h3>
          <form id="section-form">
            <div class="form-row">
              <div class="form-group"><label>Название компании</label><input type="text" data-key="company_name" value="${esc(settings.company_name || '')}"></div>
              <div class="form-group"><label>Краткое название</label><input type="text" data-key="company_short" value="${esc(settings.company_short || '')}"></div>
            </div>
            <div class="form-group"><label>Девиз</label><input type="text" data-key="motto" value="${esc(settings.motto || '')}"></div>
            <div class="form-row">
              <div class="form-group"><label>Город</label><input type="text" data-key="city" value="${esc(settings.city || '')}"></div>
              <div class="form-group"><label>Регион</label><input type="text" data-key="region" value="${esc(settings.region || '')}"></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Основной цвет</label><input type="color" data-key="primary_color" value="${esc(settings.primary_color || '#b8944f')}"></div>
              <div class="form-group"><label>Доп. цвет</label><input type="color" data-key="secondary_color" value="${esc(settings.secondary_color || '#0c1222')}"></div>
            </div>
            <div class="form-row" style="grid-template-columns:repeat(3,1fr)">
              ${['show_reviews','show_cases','show_faq','show_social','show_mobile_bar','show_prices'].map(k => `
                <div class="form-group">
                  <label>${{show_reviews:'Отзывы',show_cases:'Кейсы',show_faq:'FAQ',show_social:'Соцсети',show_mobile_bar:'Моб. панель',show_prices:'Цены'}[k]}</label>
                  <label class="toggle"><input type="checkbox" data-key="${k}" ${settings[k]==='1'?'checked':''}><span class="toggle-slider"></span></label>
                </div>
              `).join('')}
            </div>
            <button type="submit" class="btn-primary">Сохранить</button>
          </form>
        </div>`;
      setupFormHandlers(c, settings);
      return;
    }
    await renderSettingsEditor(c, section);
  }

  // ===== SHARED FORM HELPERS =====
  function renderFormField(f, value) {
    if (f.type === 'toggle') {
      return `<div class="form-group"><label>${f.label}</label><label class="toggle"><input type="checkbox" data-key="${f.key}" ${value ? 'checked' : ''}><span class="toggle-slider"></span></label></div>`;
    }
    if (f.type === 'textarea') {
      return `<div class="form-group"><label>${f.label}</label><textarea data-key="${f.key}" rows="4">${esc(value)}</textarea></div>`;
    }
    if (f.type === 'number') {
      return `<div class="form-group"><label>${f.label}</label><input type="number" data-key="${f.key}" value="${esc(value)}"></div>`;
    }
    if (f.type === 'image') {
      return `<div class="form-group"><label>${f.label}</label>
        <div class="image-upload" id="upload-${f.key}">
          <input type="file" accept="image/*" data-upload-key="${f.key}">
          ${value ? `<img src="${esc(value)}" class="image-preview">` : '<div class="image-upload-text">Нажмите или перетащите фото</div>'}
        </div>
        <input type="hidden" data-key="${f.key}" value="${esc(value)}"></div>`;
    }
    return `<div class="form-group"><label>${f.label}</label><input type="text" data-key="${f.key}" value="${esc(value)}"></div>`;
  }

  function setupFormHandlers(c, originalData) {
    const form = c.querySelector('#section-form');
    if (!form) return;
    form.onsubmit = async (e) => {
      e.preventDefault();
      const data = {};
      c.querySelectorAll('[data-key]').forEach(el => {
        if (el.type === 'file') return;
        if (el.type === 'checkbox') data[el.dataset.key] = el.checked ? '1' : '0';
        else data[el.dataset.key] = el.value;
      });
      await api('admin/settings', 'PUT', data);
      toast('Сохранено');
      refreshPreview();
    };
    setupImageUploads(c);
  }

  function setupImageUploads(c) {
    c.querySelectorAll('input[type="file"][data-upload-key]').forEach(input => {
      input.onchange = async () => {
        const file = input.files[0];
        if (!file) return;
        try {
          const uploadDiv = input.closest('.image-upload');
          uploadDiv.innerHTML = '<div class="image-upload-text">Загрузка...</div>';
          const url = await uploadImage(file);
          const hidden = c.querySelector(`[data-key="${input.dataset.uploadKey}"]`);
          if (hidden) hidden.value = url;
          uploadDiv.innerHTML = `<img src="${url}" class="image-preview"><input type="file" accept="image/*" data-upload-key="${input.dataset.uploadKey}">`;
          setupImageUploads(c);
          toast('Фото загружено');
        } catch (e) { toast('Ошибка загрузки: ' + e.message, true); }
      };
    });
  }

  function setupImageUpload(c, inputId, uploadDivId, hiddenSelector) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      try {
        const div = document.getElementById(uploadDivId);
        div.innerHTML = '<div class="image-upload-text">Загрузка...</div>';
        const url = await uploadImage(file);
        const hidden = c.querySelector(hiddenSelector);
        if (hidden) hidden.value = url;
        div.innerHTML = `<img src="${url}" class="image-preview"><input type="file" accept="image/*" id="${inputId}">`;
        setupImageUpload(c, inputId, uploadDivId, hiddenSelector);
        toast('Фото загружено');
      } catch (e) { toast('Ошибка: ' + e.message, true); }
    };
  }

  function refreshPreview() {
    const frame = document.getElementById('preview-frame');
    if (frame) frame.src = frame.src;
  }

  // ===== HELPERS =====
  function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
  function statusClass(s) { return { new: 'new', in_progress: 'progress', completed: 'done', archive: 'archive' }[s] || 'new'; }
  function statusLabel(s) { return { new: 'Новая', in_progress: 'В работе', completed: 'Завершена', archive: 'Архив' }[s] || s; }

  // ===== INIT =====
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
