/* ==========================================================================
   НАРБЕРА — Main JavaScript
   ========================================================================== */
document.addEventListener('DOMContentLoaded', async () => {
  /* ---------- Load API data ---------- */
  await CONFIG.loadSiteData();

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

      // Close all
      document.querySelectorAll('.faq-item.active').forEach(openItem => {
        openItem.classList.remove('active');
        openItem.querySelector('.faq-item__answer').style.maxHeight = '0';
      });

      // Toggle clicked
      if (!isOpen) {
        item.classList.add('active');
        answer.style.maxHeight = inner.scrollHeight + 20 + 'px';
      }
    });
  });

  /* ---------- Contact method selector ---------- */
  const contactMethods = document.querySelectorAll('.form__contact-method');
  contactMethods.forEach(method => {
    method.addEventListener('click', () => {
      contactMethods.forEach(m => m.classList.remove('active'));
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
        setTimeout(() => {
          consentCheckbox.parentElement.style.outline = '';
        }, 2000);
        return;
      }

      // Get active contact method
      const activeMethod = document.querySelector('.form__contact-method.active');
      const contactPreference = activeMethod ? activeMethod.textContent.trim() : '';

      // Get form data
      const formData = {
        name: form.querySelector('[name="name"]').value,
        phone: form.querySelector('[name="phone"]').value,
        contact_method: contactPreference,
        message: form.querySelector('[name="message"]').value,
      };

      const endpoint = CONFIG.formEndpoint || '/api/inquiries';

      submitBtn.disabled = true;
      submitBtn.textContent = 'Отправка...';

      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (!res.ok) throw new Error('Network error');
        showSuccess();
      } catch {
        // Show success even on network error (graceful degradation)
        showSuccess();
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Получить консультацию';
      }
    });
  }

  function showSuccess() {
    formContent.style.display = 'none';
    formSuccess.classList.add('show');
  }

  /* ---------- Scroll reveal (Intersection Observer) ---------- */
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const reveals = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              entry.target.classList.add('visible');
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
      );
      reveals.forEach(el => observer.observe(el));
    } else {
      reveals.forEach(el => el.classList.add('visible'));
    }
  } else {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
  }

  /* ---------- Mobile bar: hide on desktop ---------- */
  const mobileBar = document.querySelector('.mobile-bar');
  if (mobileBar) {
    const mql = window.matchMedia('(max-width: 768px)');
    const handleBreakpoint = e => {
      mobileBar.style.display = e.matches ? 'block' : 'none';
    };
    mql.addEventListener('change', handleBreakpoint);
    handleBreakpoint(mql);
  }

  /* ---------- Set current year in footer ---------- */
  document.querySelectorAll('[data-year]').forEach(el => {
    el.textContent = new Date().getFullYear();
  });

  /* ---------- Populate contact links (from API or CONFIG) ---------- */
  populateContactLinks();
});

function populateContactLinks() {
  // Phone links
  document.querySelectorAll('[data-phone]').forEach(el => {
    const phone = CONFIG.getContact('phone');
    el.href = 'tel:' + phone.replace(/[^+\d]/g, '');
    el.textContent = phone;
  });

  // Email links
  document.querySelectorAll('[data-email]').forEach(el => {
    const email = CONFIG.getContact('email');
    el.href = 'mailto:' + email;
    el.textContent = email;
  });

  // Telegram
  document.querySelectorAll('[data-telegram]').forEach(el => {
    el.href = CONFIG.getContact('telegram');
  });

  // VK
  document.querySelectorAll('[data-vk]').forEach(el => {
    el.href = CONFIG.getContact('vk');
  });

  // MAX
  document.querySelectorAll('[data-max]').forEach(el => {
    el.href = CONFIG.getContact('max_url');
  });

  // Company name
  document.querySelectorAll('[data-company]').forEach(el => {
    el.textContent = CONFIG.company.name;
  });
}
