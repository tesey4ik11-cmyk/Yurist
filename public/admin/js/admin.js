(function () {
  'use strict';
  const API = '/api';
  let token = localStorage.getItem('admin_token');
  let currentPage = '';
  let settings = {};

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
      const maxSize = 800;
      const canvas = document.createElement('canvas');
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > maxSize || h > maxSize) {
          if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
          else { w = Math.round(w * maxSize / h); h = maxSize; }
        }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        api('admin/upload', 'POST', { data: dataUrl, filename: file.name })
          .then(data => resolve(data.url))
          .catch(reject);
      };
      img.onerror = () => reject(new Error('Ошибка чтения изображения'));
      img.src = URL.createObjectURL(file);
    });
  }

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

  function toast(msg, isError) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.style.background = isError ? 'var(--a-danger)' : 'var(--a-success)';
    t.style.display = 'block';
    setTimeout(() => t.style.display = 'none', 3000);
  }

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

  function handleRoute() {
    const hash = location.hash.slice(2) || 'dashboard';
    currentPage = hash;
    document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.page === hash));
    document.getElementById('topbar-title').textContent = { dashboard: 'Дашборд', editor: 'Редактор сайта', inquiries: 'Заявки' }[hash] || hash;
    loadPage(hash);
  }

  async function loadPage(page) {
    const c = document.getElementById('page-content');
    c.innerHTML = '<div class="empty-state"><p>Загрузка...</p></div>';
    try {
      if (page === 'dashboard') return await renderDashboard(c);
      if (page === 'inquiries') return await renderInquiriesPage(c);
      if (page === 'editor') return await renderEditor(c);
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
    c.innerHTML = `<div class="card">${items.length ? `<div class="table-wrap"><table>
      <tr><th>ID</th><th>Дата</th><th>Имя</th><th>Телефон</th><th>Способ</th><th>Сообщение</th><th>Статус</th><th></th></tr>
      ${items.map(i => `<tr>
        <td>${i.id}</td><td>${new Date(i.created_at).toLocaleDateString('ru')}</td>
        <td>${esc(i.name)}</td><td>${esc(i.phone)}</td><td>${esc(i.contact_method || '')}</td>
        <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(i.message)}">${esc(i.message)}</td>
        <td><select class="status-select" data-id="${i.id}">
          <option value="new" ${i.status==='new'?'selected':''}>Новая</option>
          <option value="in_progress" ${i.status==='in_progress'?'selected':''}>В работе</option>
          <option value="completed" ${i.status==='completed'?'selected':''}>Завершена</option>
          <option value="archive" ${i.status==='archive'?'selected':''}>Архив</option>
        </select></td>
        <td><button class="btn-danger btn-sm del-inq" data-id="${i.id}">Удалить</button></td>
      </tr>`).join('')}
    </table></div>` : '<div class="empty-state"><p>Пока нет заявок</p></div>'}</div>`;
    c.querySelectorAll('.status-select').forEach(sel => {
      sel.onchange = async () => {
        await api('admin/inquiries', 'PUT', { id: sel.dataset.id, status: sel.value });
        toast('Статус обновлён');
      };
    });
    c.querySelectorAll('.del-inq').forEach(btn => {
      btn.onclick = async () => {
        if (!confirm('Удалить заявку?')) return;
        await api('admin/inquiries', 'DELETE', { id: btn.dataset.id });
        toast('Удалено');
        renderInquiriesPage(c);
      };
    });
  }

  // ===== EDITOR (click-to-edit) =====
  const sections = [
    { id: 'hero', label: 'Главный экран', icon: '🏠' },
    { id: 'header', label: 'Шапка сайта', icon: '📌' },
    { id: 'problems', label: 'Юридические вопросы', icon: '❓' },
    { id: 'services', label: 'Услуги', icon: '💼', type: 'crud' },
    { id: 'advantages', label: 'Преимущества', icon: '✅', type: 'crud' },
    { id: 'expert', label: 'Эксперт', icon: '👤', type: 'expert' },
    { id: 'process', label: 'Как работаем', icon: '📋', type: 'crud-steps' },
    { id: 'who', label: 'Банкротство если…', icon: '📊' },
    { id: 'cases', label: 'Кейсы', icon: '📁', type: 'crud' },
    { id: 'reviews', label: 'Отзывы', icon: '⭐', type: 'crud' },
    { id: 'faq', label: 'FAQ', icon: '💬', type: 'crud' },
    { id: 'form', label: 'Форма заявки', icon: '📝' },
    { id: 'contacts', label: 'Контакты', icon: '📞', type: 'contacts' },
    { id: 'general', label: 'Общее / Футер', icon: '⚙️' },
    { id: 'seo', label: 'SEO', icon: '🔍', type: 'seo' },
  ];

  const sectionFields = {
    hero: [
      { key: 'hero_badge', label: 'Бейдж', type: 'text' },
      { key: 'hero_title', label: 'Заголовок H1', type: 'text' },
      { key: 'hero_subtitle', label: 'Подзаголовок', type: 'textarea' },
      { key: 'hero_button', label: 'Текст кнопки', type: 'text' },
      { key: 'hero_call_button', label: 'Текст кнопки "Звонок"', type: 'text' },
      { key: 'hero_note', label: 'Подпись под кнопкой', type: 'text' },
      { key: 'hero_trust', label: 'Доверие (через точку)', type: 'text' },
      { key: 'hero_image', label: 'Фото юриста', type: 'image' },
      { key: 'hero_image_badge_text', label: 'Текст бейджа на фото', type: 'text' },
      { key: 'hero_image_badge_sub', label: 'Подпись бейджа', type: 'text' },
    ],
    header: [
      { key: 'header_info', label: 'Инфо слева', type: 'text' },
      { key: 'header_info_bold', label: 'Жирный текст', type: 'text' },
      { key: 'header_cta', label: 'Текст кнопки', type: 'text' },
    ],
    problems: [
      { key: 'problems_title', label: 'Заголовок', type: 'text' },
      { key: 'problems_subtitle', label: 'Подзаголовок', type: 'textarea' },
      { key: 'problems_button', label: 'Текст кнопки', type: 'text' },
    ],
    who: [
      { key: 'who_title', label: 'Заголовок', type: 'text' },
      { key: 'who_subtitle', label: 'Подзаголовок', type: 'textarea' },
      { key: 'who_cta', label: 'Текст кнопки', type: 'text' },
    ],
    process: [
      { key: 'process_title', label: 'Заголовок', type: 'text' },
      { key: 'process_subtitle', label: 'Подзаголовок', type: 'textarea' },
      { key: 'process_cta', label: 'Текст кнопки', type: 'text' },
    ],
    cases: [
      { key: 'cases_title', label: 'Заголовок', type: 'text' },
      { key: 'cases_subtitle', label: 'Подзаголовок', type: 'textarea' },
    ],
    reviews: [
      { key: 'reviews_title', label: 'Заголовок', type: 'text' },
      { key: 'reviews_subtitle', label: 'Подзаголовок', type: 'textarea' },
    ],
    faq: [
      { key: 'faq_title', label: 'Заголовок', type: 'text' },
      { key: 'faq_subtitle', label: 'Подзаголовок', type: 'textarea' },
    ],
    form: [
      { key: 'form_title', label: 'Заголовок', type: 'text' },
      { key: 'form_subtitle', label: 'Подзаголовок', type: 'textarea' },
      { key: 'form_button', label: 'Текст кнопки', type: 'text' },
      { key: 'form_success_title', label: 'Заголовок успеха', type: 'text' },
      { key: 'form_success_text', label: 'Текст успеха', type: 'textarea' },
    ],
    services: [
      { key: 'services_title', label: 'Заголовок', type: 'text' },
      { key: 'services_subtitle', label: 'Подзаголовок', type: 'textarea' },
    ],
    advantages: [
      { key: 'advantages_title', label: 'Заголовок', type: 'text' },
      { key: 'advantages_subtitle', label: 'Подзаголовок', type: 'textarea' },
    ],
    general: [
      { key: 'company_name', label: 'Название компании', type: 'text' },
      { key: 'company_short', label: 'Краткое название', type: 'text' },
      { key: 'motto', label: 'Девиз', type: 'text' },
      { key: 'city', label: 'Город', type: 'text' },
      { key: 'region', label: 'Регион', type: 'text' },
      { key: 'inn', label: 'ИНН', type: 'text' },
      { key: 'ogrn', label: 'ОГРН', type: 'text' },
      { key: 'primary_color', label: 'Основной цвет', type: 'color' },
      { key: 'secondary_color', label: 'Доп. цвет', type: 'color' },
      { key: 'footer_disclaimer', label: 'Дисклеймер футера', type: 'textarea' },
      { key: 'show_reviews', label: 'Показывать отзывы', type: 'toggle' },
      { key: 'show_cases', label: 'Показывать кейсы', type: 'toggle' },
      { key: 'show_faq', label: 'Показывать FAQ', type: 'toggle' },
      { key: 'show_social', label: 'Показывать соцсети', type: 'toggle' },
      { key: 'show_mobile_bar', label: 'Мобильная панель', type: 'toggle' },
    ],
  };

  async function renderEditor(c) {
    settings = await api('admin/settings');
    c.innerHTML = `
      <div class="editor-layout">
        <div class="editor-sidebar">
          <div class="editor-sidebar-title">Разделы сайта</div>
          <div class="editor-section-list" id="section-list">
            ${sections.map(s => `<button class="editor-section-btn${s.id === 'hero' ? ' active' : ''}" data-section="${s.id}">
              <span class="editor-section-icon">${s.icon}</span> ${s.label}
              ${s.type ? '<span class="editor-section-badge">CMS</span>' : ''}
            </button>`).join('')}
          </div>
        </div>
        <div class="editor-form-panel" id="editor-form"></div>
        <div class="editor-preview-panel">
          <div class="preview-label">Предпросмотр</div>
          <iframe id="preview-frame" src="/?edit=1"></iframe>
        </div>
      </div>`;

    const sectionList = document.getElementById('section-list');
    sectionList.querySelectorAll('.editor-section-btn').forEach(btn => {
      btn.onclick = () => {
        sectionList.querySelectorAll('.editor-section-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        loadEditorSection(btn.dataset.section);
      };
    });

    // Listen for edit-click from iframe
    window.addEventListener('message', e => {
      if (e.data && e.data.type === 'edit-click') {
        const sectionBtn = sectionList.querySelector(`[data-section="${e.data.section}"]`);
        if (sectionBtn) sectionBtn.click();
        setTimeout(() => {
          const field = document.querySelector(`[data-field-key="${e.data.key}"]`);
          if (field) { field.scrollIntoView({ behavior: 'smooth', block: 'center' }); field.classList.add('field-highlight'); setTimeout(() => field.classList.remove('field-highlight'), 2000); }
        }, 300);
      }
    });

    loadEditorSection('hero');
  }

  async function loadEditorSection(sectionId) {
    const form = document.getElementById('editor-form');
    form.innerHTML = '<div class="empty-state"><p>Загрузка...</p></div>';

    try {
      const sec = sections.find(s => s.id === sectionId);

      if (sec && sec.type === 'crud') {
        await renderCrudSection(form, sectionId);
        return;
      }
      if (sec && sec.type === 'expert') {
        await renderExpertSection(form);
        return;
      }
      if (sec && sec.type === 'contacts') {
        await renderContactsSection(form);
        return;
      }
      if (sec && sec.type === 'seo') {
        await renderSeoSection(form);
        return;
      }

      const fields = sectionFields[sectionId] || [];
      if (!fields.length) { form.innerHTML = '<div class="empty-state"><p>Нет полей для редактирования</p></div>'; return; }

      form.innerHTML = `
        <div class="editor-form-header">
          <h3>${sec ? sec.label : sectionId}</h3>
          <button class="btn-primary" id="save-section-btn">💾 Сохранить</button>
        </div>
        <div class="editor-form-body">
          ${fields.map(f => renderField(f, settings[f.key] || '')).join('')}
        </div>`;

      document.getElementById('save-section-btn').onclick = async () => {
        const data = {};
        form.querySelectorAll('[data-field-key]').forEach(el => {
          if (el.type === 'checkbox') data[el.dataset.fieldKey] = el.checked ? '1' : '0';
          else data[el.dataset.fieldKey] = el.value;
        });
        await api('admin/settings', 'PUT', data);
        Object.assign(settings, data);
        toast('Сохранено');
        refreshPreview();
      };

      setupImageUploads(form);
    } catch (e) {
      form.innerHTML = `<div class="empty-state"><p>Ошибка: ${e.message}</p></div>`;
    }
  }

  // ===== EXPERT EDITOR =====
  async function renderExpertSection(form) {
    const expert = await api('admin/expert');
    form.innerHTML = `
      <div class="editor-form-header">
        <h3>Эксперт</h3>
        <button class="btn-primary" id="save-section-btn">💾 Сохранить</button>
      </div>
      <div class="editor-form-body">
        <div class="field-row">
          <div class="field"><label>Имя</label><input type="text" data-field-key="name" value="${esc(expert.name || '')}"></div>
          <div class="field"><label>Должность</label><input type="text" data-field-key="role" value="${esc(expert.role || '')}"></div>
        </div>
        <div class="field">
          <label>Фото</label>
          <div class="image-upload-zone" id="expert-photo-zone">
            <input type="file" accept="image/*" id="expert-photo-input">
            ${expert.photo_url ? `<img src="${esc(expert.photo_url)}" class="image-preview">` : '<div class="upload-placeholder">Нажмите или перетащите фото</div>'}
          </div>
          <input type="hidden" data-field-key="photo_url" value="${esc(expert.photo_url || '')}">
        </div>
        <div class="field"><label>Описание</label><textarea data-field-key="bio" rows="4">${esc(expert.bio || '')}</textarea></div>
        <div class="field-row">
          <div class="field"><label>Опыт</label><input type="text" data-field-key="experience" value="${esc(expert.experience || '')}"></div>
          <div class="field"><label>Специализация</label><input type="text" data-field-key="specialization" value="${esc(expert.specialization || '')}"></div>
        </div>
        <div class="field"><label>Достижения</label><textarea data-field-key="achievements" rows="3">${esc(expert.achievements || '')}</textarea></div>
        <div class="field"><label>Статистика (через запятую)</label><input type="text" data-field-key="stats" value="${esc(expert.stats || '')}"></div>
      </div>`;

    document.getElementById('save-section-btn').onclick = async () => {
      const data = {};
      form.querySelectorAll('[data-field-key]').forEach(el => { if (el.type !== 'file') data[el.dataset.fieldKey] = el.value; });
      await api('admin/expert', 'POST', data);
      toast('Сохранено');
      refreshPreview();
    };

    setupImageUploadById('expert-photo-input', 'expert-photo-zone', '[data-field-key="photo_url"]', form);
  }

  // ===== CONTACTS EDITOR =====
  async function renderContactsSection(form) {
    const contacts = await api('admin/contacts');
    form.innerHTML = `
      <div class="editor-form-header">
        <h3>Контакты</h3>
        <button class="btn-primary" id="save-section-btn">💾 Сохранить</button>
      </div>
      <div class="editor-form-body">
        <div class="field-row">
          <div class="field"><label>Телефон</label><input type="text" data-field-key="phone" value="${esc(contacts.phone || '')}"></div>
          <div class="field"><label>Email</label><input type="text" data-field-key="email" value="${esc(contacts.email || '')}"></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Telegram</label><input type="text" data-field-key="telegram" value="${esc(contacts.telegram || '')}"></div>
          <div class="field"><label>VK</label><input type="text" data-field-key="vk" value="${esc(contacts.vk || '')}"></div>
        </div>
        <div class="field-row">
          <div class="field"><label>MAX</label><input type="text" data-field-key="max_url" value="${esc(contacts.max_url || '')}"></div>
          <div class="field"><label>Часы работы</label><input type="text" data-field-key="work_hours" value="${esc(contacts.work_hours || '')}"></div>
        </div>
        <div class="field"><label>Адрес</label><input type="text" data-field-key="address" value="${esc(contacts.address || '')}"></div>
        <div class="field"><label>Регион</label><input type="text" data-field-key="region" value="${esc(settings.region || '')}"></div>
        <div class="field"><label>Карта (iframe src)</label><input type="text" data-field-key="map_url" value="${esc(contacts.map_url || '')}"></div>
      </div>`;

    document.getElementById('save-section-btn').onclick = async () => {
      const data = {};
      form.querySelectorAll('[data-field-key]').forEach(el => { data[el.dataset.fieldKey] = el.value; });
      const { region, ...contactData } = data;
      await api('admin/contacts', 'POST', contactData);
      if (region !== undefined) {
        await api('admin/settings', 'POST', { key: 'region', value: region });
      }
      toast('Сохранено');
      refreshPreview();
    };
  }

  // ===== SEO EDITOR =====
  async function renderSeoSection(form) {
    const seo = await api('admin/seo');
    form.innerHTML = `
      <div class="editor-form-header">
        <h3>SEO</h3>
        <button class="btn-primary" id="save-section-btn">💾 Сохранить</button>
      </div>
      <div class="editor-form-body">
        <div class="field"><label>Title</label><input type="text" data-field-key="title" value="${esc(seo.title || '')}"></div>
        <div class="field"><label>Description</label><textarea data-field-key="description" rows="3">${esc(seo.description || '')}</textarea></div>
        <div class="field"><label>Keywords</label><input type="text" data-field-key="keywords" value="${esc(seo.keywords || '')}"></div>
        <div class="field-row">
          <div class="field"><label>OG Title</label><input type="text" data-field-key="og_title" value="${esc(seo.og_title || '')}"></div>
          <div class="field"><label>OG Description</label><input type="text" data-field-key="og_description" value="${esc(seo.og_description || '')}"></div>
        </div>
        <div class="field-row">
          <div class="field"><label>OG Image</label><input type="text" data-field-key="og_image" value="${esc(seo.og_image || '')}"></div>
          <div class="field"><label>Canonical</label><input type="text" data-field-key="canonical" value="${esc(seo.canonical || '')}"></div>
        </div>
      </div>`;

    document.getElementById('save-section-btn').onclick = async () => {
      const data = {};
      form.querySelectorAll('[data-field-key]').forEach(el => { data[el.dataset.fieldKey] = el.value; });
      await api('admin/seo', 'POST', data);
      toast('Сохранено');
      refreshPreview();
    };
  }

  // ===== CRUD SECTIONS =====
  const crudConfig = {
    services: { table: 'services', title: 'Услуги', fields: [
      { key: 'title', label: 'Название', type: 'text' },
      { key: 'description', label: 'Описание', type: 'textarea' },
      { key: 'icon', label: 'Иконка (эмодзи)', type: 'text' },
      { key: 'sort_order', label: 'Порядок', type: 'number' },
      { key: 'active', label: 'Активна', type: 'toggle' },
    ]},
    advantages: { table: 'advantages', title: 'Преимущества', fields: [
      { key: 'title', label: 'Название', type: 'text' },
      { key: 'description', label: 'Описание', type: 'textarea' },
      { key: 'icon', label: 'Иконка (эмодзи)', type: 'text' },
      { key: 'sort_order', label: 'Порядок', type: 'number' },
      { key: 'active', label: 'Активна', type: 'toggle' },
    ]},
    cases: { table: 'cases', title: 'Кейсы', fields: [
      { key: 'title', label: 'Название', type: 'text' },
      { key: 'situation', label: 'Ситуация', type: 'textarea' },
      { key: 'problem', label: 'Проблема', type: 'textarea' },
      { key: 'solution', label: 'Что сделано', type: 'textarea' },
      { key: 'result', label: 'Результат', type: 'textarea' },
      { key: 'is_demo', label: 'Демо', type: 'toggle' },
      { key: 'active', label: 'Активен', type: 'toggle' },
    ]},
    reviews: { table: 'reviews', title: 'Отзывы', fields: [
      { key: 'author_name', label: 'Имя автора', type: 'text' },
      { key: 'city', label: 'Город', type: 'text' },
      { key: 'text', label: 'Текст отзыва', type: 'textarea' },
      { key: 'rating', label: 'Рейтинг (1-5)', type: 'number' },
      { key: 'date', label: 'Дата', type: 'text' },
      { key: 'is_demo', label: 'Демо', type: 'toggle' },
      { key: 'published', label: 'Опубликован', type: 'toggle' },
    ]},
    faq: { table: 'faq', title: 'FAQ', fields: [
      { key: 'question', label: 'Вопрос', type: 'text' },
      { key: 'answer', label: 'Ответ', type: 'textarea' },
      { key: 'sort_order', label: 'Порядок', type: 'number' },
      { key: 'active', label: 'Активен', type: 'toggle' },
    ]},
    steps: { table: 'steps', title: 'Этапы работы', fields: [
      { key: 'number', label: 'Номер', type: 'number' },
      { key: 'title', label: 'Название', type: 'text' },
      { key: 'description', label: 'Описание', type: 'textarea' },
      { key: 'sort_order', label: 'Порядок', type: 'number' },
      { key: 'active', label: 'Активен', type: 'toggle' },
    ]},
  };

  async function renderCrudSection(form, entity) {
    const cfg = crudConfig[entity];
    const headerSec = sectionFields[entity] || [];
    const items = await api(cfg.table);

    form.innerHTML = `
      <div class="editor-form-header">
        <h3>${cfg.title}</h3>
        <button class="btn-primary" id="crud-add-btn">+ Добавить</button>
      </div>
      ${headerSec.length ? `<div class="editor-form-body" style="border-bottom:1px solid var(--a-border);margin-bottom:16px;padding-bottom:16px">
        <h4 style="margin-bottom:12px;color:var(--a-text-dim);font-size:12px;text-transform:uppercase">Заголовок секции</h4>
        ${headerSec.map(f => renderField(f, settings[f.key] || '')).join('')}
        <button class="btn-primary" id="save-header-btn" style="margin-top:8px">💾 Сохранить заголовок</button>
      </div>` : ''}
      <div class="crud-list" id="crud-list">
        ${items.map(item => `
          <div class="crud-item">
            <div class="crud-item-header">
              <span class="crud-item-title">${esc(String(item.title || item.question || item.author_name || `#${item.id}`))}</span>
              <div class="crud-item-actions">
                <button class="btn-outline btn-sm crud-edit" data-id="${item.id}">Ред.</button>
                <button class="btn-danger btn-sm crud-del" data-id="${item.id}">Удал.</button>
              </div>
            </div>
          </div>
        `).join('')}
        ${!items.length ? '<div class="empty-state"><p>Пока нет записей</p></div>' : ''}
      </div>`;

    if (headerSec.length) {
      document.getElementById('save-header-btn').onclick = async () => {
        const data = {};
        form.querySelectorAll('.editor-form-body[data-field-key]').forEach(el => data[el.dataset.fieldKey] = el.value);
        form.querySelectorAll('.editor-form-body [data-field-key]').forEach(el => {
          if (el.type === 'checkbox') data[el.dataset.fieldKey] = el.checked ? '1' : '0';
          else data[el.dataset.fieldKey] = el.value;
        });
        await api('admin/settings', 'PUT', data);
        Object.assign(settings, data);
        toast('Заголовок сохранён');
        refreshPreview();
      };
    }

    document.getElementById('crud-add-btn').onclick = () => {
      openModal(`Добавить: ${cfg.title}`, buildCrudForm(cfg.fields, {}), async () => {
        const data = collectCrudForm(cfg.fields);
        await api(cfg.table, 'POST', data);
      });
    };

    form.querySelectorAll('.crud-edit').forEach(btn => {
      btn.onclick = () => {
        const item = items.find(i => i.id == btn.dataset.id);
        openModal(`Редактировать: ${cfg.title}`, buildCrudForm(cfg.fields, item), async () => {
          const data = collectCrudForm(cfg.fields);
          await api(cfg.table, 'PUT', { ...data, id: btn.dataset.id });
        });
      };
    });

    form.querySelectorAll('.crud-del').forEach(btn => {
      btn.onclick = async () => {
        if (!confirm('Удалить запись?')) return;
        await api(cfg.table, 'DELETE', { id: btn.dataset.id });
        toast('Удалено');
        renderCrudSection(form, entity);
      };
    });
  }

  function buildCrudForm(fields, item) {
    return `<form id="modal-form">${fields.map(f => renderField(f, item[f.key] || '')).join('')}</form>`;
  }

  function collectCrudForm(fields) {
    const data = {};
    const form = document.getElementById('modal-form');
    fields.forEach(f => {
      const el = form.querySelector(`[data-field-key="${f.key}"]`);
      if (!el) return;
      if (f.type === 'toggle') data[f.key] = el.checked ? 1 : 0;
      else data[f.key] = el.value;
    });
    return data;
  }

  // ===== FIELD RENDERING =====
  function renderField(f, value) {
    if (f.type === 'toggle') {
      return `<div class="field" data-field-key="${f.key}"><label>${f.label}</label><label class="toggle"><input type="checkbox" data-field-key="${f.key}" ${value ? 'checked' : ''}><span class="toggle-slider"></span></label></div>`;
    }
    if (f.type === 'textarea') {
      return `<div class="field" data-field-key="${f.key}"><label>${f.label}</label><textarea data-field-key="${f.key}" rows="3">${esc(value)}</textarea></div>`;
    }
    if (f.type === 'number') {
      return `<div class="field" data-field-key="${f.key}"><label>${f.label}</label><input type="number" data-field-key="${f.key}" value="${esc(value)}"></div>`;
    }
    if (f.type === 'color') {
      return `<div class="field" data-field-key="${f.key}"><label>${f.label}</label><input type="color" data-field-key="${f.key}" value="${esc(value || '#b8944f')}" style="height:40px"></div>`;
    }
    if (f.type === 'image') {
      return `<div class="field" data-field-key="${f.key}"><label>${f.label}</label>
        <div class="image-upload-zone" id="upload-${f.key}">
          <input type="file" accept="image/*" data-upload-key="${f.key}">
          ${value ? `<img src="${esc(value)}" class="image-preview">` : '<div class="upload-placeholder">Нажмите или перетащите фото</div>'}
        </div>
        <input type="hidden" data-field-key="${f.key}" value="${esc(value)}"></div>`;
    }
    return `<div class="field" data-field-key="${f.key}"><label>${f.label}</label><input type="text" data-field-key="${f.key}" value="${esc(value)}"></div>`;
  }

  function setupImageUploads(container) {
    container.querySelectorAll('input[type="file"][data-upload-key]').forEach(input => {
      input.onchange = async () => {
        const file = input.files[0];
        if (!file) return;
        try {
          const zone = input.closest('.image-upload-zone');
          zone.innerHTML = '<div class="upload-placeholder">Загрузка...</div>';
          const url = await uploadImage(file);
          const hidden = container.querySelector(`[data-field-key="${input.dataset.uploadKey}"]`);
          if (hidden) hidden.value = url;
          zone.innerHTML = `<img src="${url}" class="image-preview"><input type="file" accept="image/*" data-upload-key="${input.dataset.uploadKey}">`;
          setupImageUploads(container);
          toast('Фото загружено');
        } catch (e) { toast('Ошибка загрузки: ' + e.message, true); }
      };
    });
  }

  function setupImageUploadById(inputId, zoneId, hiddenSelector, container) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      try {
        const zone = document.getElementById(zoneId);
        zone.innerHTML = '<div class="upload-placeholder">Загрузка...</div>';
        const url = await uploadImage(file);
        const hidden = container.querySelector(hiddenSelector);
        if (hidden) hidden.value = url;
        zone.innerHTML = `<img src="${url}" class="image-preview"><input type="file" accept="image/*" id="${inputId}">`;
        setupImageUploadById(inputId, zoneId, hiddenSelector, container);
        toast('Фото загружено');
      } catch (e) { toast('Ошибка: ' + e.message, true); }
    };
  }

  function refreshPreview() {
    const frame = document.getElementById('preview-frame');
    if (frame) frame.src = '/?edit=1&t=' + Date.now();
  }

  function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
  function statusClass(s) { return { new: 'new', in_progress: 'progress', completed: 'done', archive: 'archive' }[s] || 'new'; }
  function statusLabel(s) { return { new: 'Новая', in_progress: 'В работе', completed: 'Завершена', archive: 'Архив' }[s] || s; }

  // ===== INIT =====
  document.getElementById('login-form').onsubmit = async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('login-error');
    errEl.style.display = 'none';
    try { await login(document.getElementById('login-email').value, document.getElementById('login-password').value); }
    catch (e) { errEl.textContent = e.message; errEl.style.display = 'block'; }
  };

  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.onclick = (e) => { e.preventDefault(); const page = item.dataset.page; if (page) location.hash = '#/' + page; };
  });

  document.getElementById('logout-btn').onclick = (e) => { e.preventDefault(); logout(); };
  document.getElementById('menu-toggle').onclick = () => document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebar-close').onclick = () => document.getElementById('sidebar').classList.remove('open');
  document.getElementById('modal-close').onclick = closeModal;
  document.getElementById('modal-cancel').onclick = closeModal;
  document.getElementById('modal-overlay').onclick = (e) => { if (e.target === e.currentTarget) closeModal(); };

  window.addEventListener('hashchange', handleRoute);
  checkAuth();
})();
