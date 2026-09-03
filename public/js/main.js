/* ==========================================================================
   НАРБЕРА — Main JavaScript
   ========================================================================== */
document.addEventListener('DOMContentLoaded', async () => {
  /* ---------- Load API data ---------- */
  const siteData = await CONFIG.loadSiteData();

  /* ---------- Populate dynamic content ---------- */
  if (siteData) populateAllContent(siteData);

  /* ---------- Header scroll ---------- */
  const header = document.querySelector('.header');
  const onScroll = () => {
    header.classList.toggle('header--scrolled', window.scrollY > 20);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Smooth scroll for anchors ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const id = anchor.getAttribute('href');
      if (id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const offset = 80;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

  /* ---------- FAQ Accordion ---------- */
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
      if (!isOpen) {
        item.classList.add('active');
        answer.style.maxHeight = inner.scrollHeight + 20 + 'px';
      }
    });
  });

  /* ---------- Contact method selector ---------- */
  document.querySelectorAll('.form__contact-method').forEach(method => {
    method.addEventListener('click', () => {
      document.querySelectorAll('.form__contact-method').forEach(m => m.classList.remove('active'));
      method.classList.add('active');
    });
  });

  /* ---------- Form handling ---------- */
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
      finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Получить консультацию';
      }
    });
  }

  function showSuccess() {
    formContent.style.display = 'none';
    formSuccess.classList.add('show');
  }

  /* ---------- Scroll reveal ---------- */
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const reveals = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
      reveals.forEach(el => observer.observe(el));
    } else { reveals.forEach(el => el.classList.add('visible')); }
  } else { document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible')); }

  /* ---------- Mobile bar ---------- */
  const mobileBar = document.querySelector('.mobile-bar');
  if (mobileBar) {
    const mql = window.matchMedia('(max-width: 768px)');
    const handle = e => { mobileBar.style.display = e.matches ? 'block' : 'none'; };
    mql.addEventListener('change', handle);
    handle(mql);
  }

  /* ---------- Set year ---------- */
  document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

  /* ---------- Populate contact links ---------- */
  populateContactLinks();
});

/* ---------- Populate ALL content from API ---------- */
function populateAllContent(data) {
  const s = data.settings || {};
  const e = data.expert || {};
  const c = data.contacts || {};
  const seo = data.seo || {};

  // SEO
  if (seo.title) document.title = seo.title;
  if (seo.description) setMeta('description', seo.description);
  if (seo.keywords) setMeta('keywords', seo.keywords);
  if (seo.og_title) setMetaProperty('og:title', seo.og_title);
  if (seo.og_description) setMetaProperty('og:description', seo.og_description);
  if (seo.canonical) setCanonical(seo.canonical);

  // Hero
  setTextById('hero-badge', s.hero_badge);
  setHtmlById('hero-title', s.hero_title);
  setTextById('hero-subtitle', s.hero_subtitle);
  setTextById('hero-btn', s.hero_button);
  setTextById('hero-note', s.hero_note);
  setImgSrcById('hero-photo', s.hero_image);

  // About
  setTextById('about-title', s.about_title);
  setTextById('about-role', s.about_role);
  setTextById('about-bio', s.about_bio);

  // Expert
  setTextById('expert-name', e.name);
  setTextById('expert-role', e.role);
  setTextById('expert-bio', e.bio);
  setTextById('expert-exp', e.experience);
  setTextById('expert-spec', e.specialization);
  setTextById('expert-ach', e.achievements);
  setImgSrcById('expert-photo', e.photo_url);
  // Expert stats — simple comma-separated text
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

  // Contacts
  setTextById('contact-phone', c.phone);
  setTextById('contact-email', c.email);
  setTextById('contact-address', c.address);
  setTextById('contact-hours', c.work_hours);
  setTextById('contact-region', c.region);

  // Dynamic sections
  populateServices(data.services);
  populateSteps(data.steps);
  populateCases(data.cases);
  populateReviews(data.reviews);
  populateFaq(data.faq);
  populateAdvantages(data.advantages);

  // Footer
  setTextById('footer-company', s.company_name || CONFIG.company.name);
  setTextById('footer-motto', s.motto);
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
      <p class="advantage-card__desc">${escHtml(a.description)}</p>
    </div>
  `).join('');
}

function populateSteps(items) {
  if (!items || !items.length) return;
  const container = document.getElementById('steps-list');
  if (!container) return;
  container.innerHTML = items.map(s => `
    <div class="step-card reveal">
      <div class="step-card__number">${escHtml(String(s.number || '').padStart(2, '0'))}</div>
      <h3 class="step-card__title">${escHtml(s.title)}</h3>
      <p class="step-card__desc">${escHtml(s.description)}</p>
    </div>
  `).join('');
}

function populateCases(items) {
  if (!items || !items.length) return;
  const container = document.getElementById('cases-list');
  if (!container) return;
  container.innerHTML = items.map(c => `
    <div class="case-card reveal">
      <h3 class="case-card__title">${escHtml(c.title)}</h3>
      ${c.situation ? `<div class="case-card__block"><strong>Ситуация:</strong> ${escHtml(c.situation)}</div>` : ''}
      ${c.problem ? `<div class="case-card__block"><strong>Проблема:</strong> ${escHtml(c.problem)}</div>` : ''}
      ${c.solution ? `<div class="case-card__block"><strong>Решение:</strong> ${escHtml(c.solution)}</div>` : ''}
      ${c.result ? `<div class="case-card__block"><strong>Результат:</strong> ${escHtml(c.result)}</div>` : ''}
      ${c.is_demo ? '<span class="badge badge-demo">Демо</span>' : ''}
    </div>
  `).join('');
}

function populateReviews(items) {
  if (!items || !items.length) return;
  const container = document.getElementById('reviews-list');
  if (!container) return;
  container.innerHTML = items.map(r => `
    <div class="review-card reveal">
      <div class="review-card__header">
        <div class="review-card__avatar">${escHtml((r.author_name || '?')[0])}</div>
        <div>
          <div class="review-card__name">${escHtml(r.author_name)}</div>
          <div class="review-card__meta">${escHtml(r.city)} · ${escHtml(r.date)}</div>
        </div>
      </div>
      <div class="review-card__rating">${'★'.repeat(r.rating || 5)}</div>
      <p class="review-card__text">${escHtml(r.text)}</p>
      ${r.is_demo ? '<span class="badge badge-demo">Демо-отзыв</span>' : ''}
    </div>
  `).join('');
}

function populateFaq(items) {
  if (!items || !items.length) return;
  const container = document.getElementById('faq-list');
  if (!container) return;
  container.innerHTML = items.map(f => `
    <div class="faq-item">
      <button class="faq-item__question">${escHtml(f.question)}</button>
      <div class="faq-item__answer"><div class="faq-item__answer-inner">${escHtml(f.answer)}</div></div>
    </div>
  `).join('');
  // Re-bind FAQ accordion
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
      if (!isOpen) {
        item.classList.add('active');
        answer.style.maxHeight = inner.scrollHeight + 20 + 'px';
      }
    });
  });
}

/* ---------- Helpers ---------- */
function setTextById(id, text) {
  if (!text) return;
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
function setHtmlById(id, html) {
  if (!html) return;
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}
function setImgSrcById(id, src) {
  if (!src) return;
  const el = document.getElementById(id);
  if (el) el.src = src;
}
function setMeta(name, content) {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) { el = document.createElement('meta'); el.name = name; document.head.appendChild(el); }
  el.content = content;
}
function setMetaProperty(prop, content) {
  let el = document.querySelector(`meta[property="${prop}"]`);
  if (!el) { el = document.createElement('meta'); el.setAttribute('property', prop); document.head.appendChild(el); }
  el.content = content;
}
function setCanonical(url) {
  let el = document.querySelector('link[rel="canonical"]');
  if (!el) { el = document.createElement('link'); el.rel = 'canonical'; document.head.appendChild(el); }
  el.href = url;
}
function escHtml(s) {
  const d = document.createElement('div');
  d.textContent = s || '';
  return d.innerHTML;
}

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
  document.querySelectorAll('[data-company]').forEach(el => { el.textContent = CONFIG.company.name; });
}
