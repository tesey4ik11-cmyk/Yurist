/* ==========================================================================
   НАРБЕРА — Main JavaScript (API-driven)
   ========================================================================== */
document.addEventListener('DOMContentLoaded', async () => {
  const siteData = await CONFIG.loadSiteData();
  if (siteData) populateAllContent(siteData);

  const header = document.querySelector('.header');
  const onScroll = () => header.classList.toggle('header--scrolled', window.scrollY > 20);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const id = anchor.getAttribute('href');
      if (id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' });
    });
  });

  document.querySelectorAll('.faq-item__question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const answer = item.querySelector('.faq-item__answer');
      const inner = item.querySelector('.faq-item__answer-inner');
      const isOpen = item.classList.contains('active');
      document.querySelectorAll('.faq-item.active').forEach(openItem => {
        openItem.classList.remove('active');
        openItem.querySelector('.faq-item__answer').style.maxHeight = '0';
      });
      if (!isOpen) { item.classList.add('active'); answer.style.maxHeight = inner.scrollHeight + 20 + 'px'; }
    });
  });

  document.querySelectorAll('.form__contact-method').forEach(method => {
    method.addEventListener('click', () => {
      document.querySelectorAll('.form__contact-method').forEach(m => m.classList.remove('active'));
      method.classList.add('active');
    });
  });

  const form = document.getElementById('consultation-form');
  const formContent = document.getElementById('form-content');
  const formSuccess = document.getElementById('form-success');
  const consentCheckbox = document.getElementById('consent-checkbox');
  const submitBtn = document.getElementById('form-submit');

  if (form) {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (!consentCheckbox.checked) {
        consentCheckbox.focus();
        consentCheckbox.parentElement.style.outline = '2px solid #e53e3e';
        setTimeout(() => { consentCheckbox.parentElement.style.outline = ''; }, 2000);
        return;
      }
      const activeMethod = document.querySelector('.form__contact-method.active');
      const formData = {
        name: form.querySelector('[name="name"]').value,
        phone: form.querySelector('[name="phone"]').value,
        contact_method: activeMethod ? activeMethod.textContent.trim() : '',
        message: form.querySelector('[name="message"]').value,
      };
      submitBtn.disabled = true;
      submitBtn.textContent = 'Отправка...';
      try {
        const res = await fetch(CONFIG.formEndpoint || '/api/inquiries', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (!res.ok) throw new Error('Network error');
        showSuccess();
      } catch { showSuccess(); }
      finally { submitBtn.disabled = false; submitBtn.textContent = CONFIG.getSetting('form_button') || 'Получить консультацию'; }
    });
  }

  function showSuccess() {
    formContent.style.display = 'none';
    formSuccess.classList.add('show');
  }

  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const reveals = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } });
      }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
      reveals.forEach(el => observer.observe(el));
    } else { reveals.forEach(el => el.classList.add('visible')); }
  } else { document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible')); }

  const mobileBar = document.querySelector('.mobile-bar');
  if (mobileBar) {
    const mql = window.matchMedia('(max-width: 768px)');
    mql.addEventListener('change', e => { mobileBar.style.display = e.matches ? 'block' : 'none'; });
    mql.dispatchEvent(new Event('change'));
  }

  document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
  populateContactLinks();

  if (window.location.search.includes('edit=1')) initEditMode();
});

function populateAllContent(data) {
  const s = data.settings || {};
  const e = data.expert || {};
  const c = data.contacts || {};
  const seo = data.seo || {};

  if (seo.title) document.title = seo.title;
  if (seo.description) setMeta('description', seo.description);
  if (seo.keywords) setMeta('keywords', seo.keywords);
  if (seo.og_title) setMetaProperty('og:title', seo.og_title);
  if (seo.og_description) setMetaProperty('og:description', seo.og_description);
  if (seo.canonical) setCanonical(seo.canonical);

  // Header
  setTextById('header-info', s.header_info);
  setTextById('header-info-bold', s.header_info_bold);
  setTextById('header-cta', s.header_cta);

  // Hero
  setTextById('hero-badge', s.hero_badge);
  setHtmlById('hero-title', s.hero_title);
  setTextById('hero-subtitle', s.hero_subtitle);
  setTextById('hero-btn', s.hero_button);
  setTextById('hero-call-btn', s.hero_call_button);
  setTextById('hero-note', s.hero_note);
  setImgSrcById('hero-photo', s.hero_image);
  setTextById('hero-image-badge-text', s.hero_image_badge_text);
  setTextById('hero-image-badge-sub', s.hero_image_badge_sub);
  // Trust items
  if (s.hero_trust) {
    const trustContainer = document.getElementById('hero-trust');
    if (trustContainer) {
      const items = s.hero_trust.split('·').map(t => t.trim()).filter(Boolean);
      trustContainer.innerHTML = items.map(t => `<span class="hero__trust-item"><span class="hero__trust-dot"></span> ${escHtml(t)}</span>`).join('');
    }
  }

  // Problems
  setTextById('problems-title', s.problems_title);
  setTextById('problems-subtitle', s.problems_subtitle);
  setTextById('problems-button', s.problems_button);

  // Services
  setTextById('services-title', s.services_title);
  setTextById('services-subtitle', s.services_subtitle);

  // Advantages
  setTextById('advantages-title', s.advantages_title);
  setTextById('advantages-subtitle', s.advantages_subtitle);

  // About / Expert
  setTextById('expert-name', e.name);
  setTextById('expert-role', e.role);
  setTextById('expert-bio', e.bio);
  setTextById('expert-exp', e.experience);
  setTextById('expert-spec', e.specialization);
  setTextById('expert-ach', e.achievements);
  setImgSrcById('expert-photo', e.photo_url);
  if (e.stats) {
    const statsArr = e.stats.split(',').map(s => s.trim()).filter(Boolean);
    const statsContainer = document.getElementById('expert-stats');
    if (statsContainer && statsArr.length) {
      statsContainer.innerHTML = statsArr.map(stat => {
        const parts = stat.split(' ');
        const value = parts[0] || '';
        const label = parts.slice(1).join(' ') || '';
        return `<div class="expert__stat"><div class="expert__stat-value">${escHtml(value)}</div><div class="expert__stat-label">${escHtml(label)}</div></div>`;
      }).join('');
    }
  }

  // Process / Steps
  setTextById('process-title', s.process_title);
  setTextById('process-subtitle', s.process_subtitle);
  setTextById('process-cta', s.process_cta);

  // Who needs
  setTextById('who-title', s.who_title);
  setTextById('who-subtitle', s.who_subtitle);
  setTextById('who-cta', s.who_cta);

  // Cases
  setTextById('cases-title', s.cases_title);
  setTextById('cases-subtitle', s.cases_subtitle);

  // Reviews
  setTextById('reviews-title', s.reviews_title);
  setTextById('reviews-subtitle', s.reviews_subtitle);

  // FAQ
  setTextById('faq-title', s.faq_title);
  setTextById('faq-subtitle', s.faq_subtitle);

  // Form
  setTextById('form-title', s.form_title);
  setTextById('form-subtitle', s.form_subtitle);
  setTextById('form-submit', s.form_button);
  setTextById('form-success-title', s.form_success_title);
  setTextById('form-success-text', s.form_success_text);

  // Contacts
  setTextById('contact-phone', c.phone);
  setTextById('contact-email', c.email);
  setTextById('contact-address', c.address);
  setTextById('contact-hours', c.work_hours);
  setTextById('contact-region', c.region);
  setTextById('contacts-title', s.contacts_title);
  setTextById('contacts-subtitle', s.contacts_subtitle);

  // Footer
  setTextById('footer-company', s.company_name || CONFIG.company.name);
  setTextById('footer-motto', s.motto);
  setTextById('footer-inn', s.inn);
  setTextById('footer-ogrn', s.ogrn);
  setTextById('footer-disclaimer', s.footer_disclaimer);

  // Dynamic sections
  populateServices(data.services);
  populateSteps(data.steps);
  populateCases(data.cases);
  populateReviews(data.reviews);
  populateFaq(data.faq);
  populateAdvantages(data.advantages);
}

function populateServices(items) {
  if (!items || !items.length) return;
  const container = document.getElementById('services-list');
  if (!container) return;
  container.innerHTML = items.map(s => `
    <div class="service-card reveal">
      <div class="service-card__icon">${escHtml(s.icon)}</div>
      <h3 class="service-card__title">${escHtml(s.title)}</h3>
      <p class="service-card__desc">${escHtml(s.description)}</p>
    </div>
  `).join('');
}

function populateAdvantages(items) {
  if (!items || !items.length) return;
  const container = document.getElementById('advantages-list');
  if (!container) return;
  container.innerHTML = items.map(a => `
    <div class="advantage-card reveal">
      <div class="advantage-card__icon">${escHtml(a.icon)}</div>
      <h3 class="advantage-card__title">${escHtml(a.title)}</h3>
      <p class="advantage-card__text">${escHtml(a.description)}</p>
    </div>
  `).join('');
}

function populateSteps(items) {
  if (!items || !items.length) return;
  const container = document.getElementById('steps-list');
  if (!container) return;
  container.innerHTML = items.map(s => `
    <div class="process-step reveal">
      <div class="process-step__num">${escHtml(String(s.number || '').padStart(2, '0'))}</div>
      <div class="process-step__content">
        <h3 class="process-step__title">${escHtml(s.title)}</h3>
        <p class="process-step__text">${escHtml(s.description)}</p>
      </div>
    </div>
  `).join('');
}

function populateCases(items) {
  if (!items || !items.length) return;
  const container = document.getElementById('cases-list');
  if (!container) return;
  container.innerHTML = items.map(c => `
    <div class="case-card reveal">
      <div class="case-card__header">
        <span class="case-card__badge">Демонстрационный пример</span>
        <h3 class="case-card__title">${escHtml(c.title)}</h3>
      </div>
      <div class="case-card__body">
        ${c.situation ? `<div class="case-card__section"><p class="case-card__label">Ситуация</p><p class="case-card__value">${escHtml(c.situation)}</p></div>` : ''}
        ${c.problem ? `<div class="case-card__section"><p class="case-card__label">Проблема</p><p class="case-card__value">${escHtml(c.problem)}</p></div>` : ''}
        ${c.solution ? `<div class="case-card__section"><p class="case-card__label">Что сделано</p><p class="case-card__value">${escHtml(c.solution)}</p></div>` : ''}
        ${c.result ? `<div class="case-card__section case-card__result"><p class="case-card__label">Результат</p><p class="case-card__value">${escHtml(c.result)}</p></div>` : ''}
      </div>
    </div>
  `).join('');
}

function populateReviews(items) {
  if (!items || !items.length) return;
  const container = document.getElementById('reviews-list');
  if (!container) return;
  container.innerHTML = items.map(r => `
    <div class="testimonial-card reveal">
      <div class="testimonial-card__header">
        <div class="testimonial-card__avatar">${escHtml((r.author_name || '?')[0])}</div>
        <div>
          <div class="testimonial-card__name">${escHtml(r.author_name)}</div>
          <div class="testimonial-card__meta">${escHtml(r.city)} · ${escHtml(r.date)}</div>
        </div>
      </div>
      <div class="testimonial-card__stars">${'★'.repeat(r.rating || 5)}</div>
      <p class="testimonial-card__text">${escHtml(r.text)}</p>
      ${r.is_demo ? '<span class="testimonial-card__badge">* Демонстрационный отзыв</span>' : ''}
    </div>
  `).join('');
}

function populateFaq(items) {
  if (!items || !items.length) return;
  const container = document.getElementById('faq-list');
  if (!container) return;
  container.innerHTML = items.map(f => `
    <div class="faq-item reveal">
      <button class="faq-item__question" aria-expanded="false">
        ${escHtml(f.question)}
        <span class="faq-item__icon">+</span>
      </button>
      <div class="faq-item__answer" role="region">
        <div class="faq-item__answer-inner">${escHtml(f.answer)}</div>
      </div>
    </div>
  `).join('');
  container.querySelectorAll('.faq-item__question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const answer = item.querySelector('.faq-item__answer');
      const inner = item.querySelector('.faq-item__answer-inner');
      const isOpen = item.classList.contains('active');
      container.querySelectorAll('.faq-item.active').forEach(openItem => {
        openItem.classList.remove('active');
        openItem.querySelector('.faq-item__answer').style.maxHeight = '0';
      });
      if (!isOpen) { item.classList.add('active'); answer.style.maxHeight = inner.scrollHeight + 20 + 'px'; }
    });
  });
}

/* ---------- Edit mode (iframe from admin) ---------- */
function initEditMode() {
  document.body.classList.add('edit-mode');
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-edit-key]');
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    window.parent.postMessage({ type: 'edit-click', key: el.dataset.editKey, section: el.dataset.editSection }, '*');
  }, true);
}

/* ---------- Helpers ---------- */
function setTextById(id, text) { if (!text) return; const el = document.getElementById(id); if (el) el.textContent = text; }
function setHtmlById(id, html) { if (!html) return; const el = document.getElementById(id); if (el) el.innerHTML = html; }
function setImgSrcById(id, src) { if (!src) return; const el = document.getElementById(id); if (el) el.src = src; }
function setMeta(name, content) { let el = document.querySelector(`meta[name="${name}"]`); if (!el) { el = document.createElement('meta'); el.name = name; document.head.appendChild(el); } el.content = content; }
function setMetaProperty(prop, content) { let el = document.querySelector(`meta[property="${prop}"]`); if (!el) { el = document.createElement('meta'); el.setAttribute('property', prop); document.head.appendChild(el); } el.content = content; }
function setCanonical(url) { let el = document.querySelector('link[rel="canonical"]'); if (!el) { el = document.createElement('link'); el.rel = 'canonical'; document.head.appendChild(el); } el.href = url; }
function escHtml(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }

function populateContactLinks() {
  document.querySelectorAll('[data-phone]').forEach(el => {
    const phone = CONFIG.getContact('phone');
    el.href = 'tel:' + phone.replace(/[^+\d]/g, '');
    el.textContent = phone;
  });
  document.querySelectorAll('[data-email]').forEach(el => {
    const email = CONFIG.getContact('email');
    el.href = 'mailto:' + email;
    el.textContent = email;
  });
  document.querySelectorAll('[data-telegram]').forEach(el => { el.href = CONFIG.getContact('telegram'); });
  document.querySelectorAll('[data-vk]').forEach(el => { el.href = CONFIG.getContact('vk'); });
  document.querySelectorAll('[data-max]').forEach(el => { el.href = CONFIG.getContact('max_url'); });
  document.querySelectorAll('[data-company]').forEach(el => { el.textContent = CONFIG.getContact('company_name') || CONFIG.company.name; });
}
