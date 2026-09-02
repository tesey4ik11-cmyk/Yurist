/**
 * Конфигурация сайта — все контактные данные и настройки бренда
 * Измените значения ниже для настройки под конкретного клиента.
 * После подключения API данные подтягиваются автоматически.
 */
const CONFIG = {
  company: {
    name: 'НАРБЕРА',
    tagline: 'Юридическая компания',
    motto: 'Качественные и честные услуги с заботой о клиенте',
    inn: '7600000000',
    ogrn: '1237600000000',
    ogrnip: '321760000000000',
    legalAddress: '150000, Ярославская область, г. Ярославль',
    email: 'info@narbera.ru',
  },

  contacts: {
    phone: '+7 (4852) 00-00-00',
    phoneRaw: 'tel:+74852000000',
    email: 'info@narbera.ru',
    emailRaw: 'mailto:info@narbera.ru',
    telegram: 'https://t.me/narbera',
    vk: 'https://vk.com/narbera',
    max: 'https://max.ru/narbera',
    workHours: 'Пн–Пт: 9:00–18:00',
    region: 'Ярославская область',
  },

  formEndpoint: '/api/inquiries',

  seo: {
    title: 'Юридические услуги в Ярославской области — НАРБЕРА',
    description:
      'Юридическая помощь: банкротство физических лиц, взыскание долгов, семейное, трудовое и жилищное право. Бесплатная консультация в Ярославской области.',
    keywords:
      'юрист Ярославль, банкротство физических лиц, юридические услуги, избавиться от долгов, семейный юрист, трудовой юрист, Ярославская область',
    ogImage: 'images/og-image.png',
    canonical: 'https://narbera.ru/',
  },

  // API data cache
  _apiData: null,
  _apiLoaded: false,

  /**
   * Fetch site data from API. Returns cached result or defaults from CONFIG.
   */
  async loadSiteData() {
    if (this._apiLoaded) return this._apiData;
    try {
      const res = await fetch('/api/site');
      if (!res.ok) throw new Error('API unavailable');
      const data = await res.json();
      this._apiData = data;
      this._apiLoaded = true;
      return data;
    } catch {
      this._apiLoaded = true;
      return null;
    }
  },

  /**
   * Get contact value: prefer API, fallback to CONFIG.
   */
  getContact(key) {
    const api = this._apiData;
    if (api && api.contacts && api.contacts[key] !== undefined) return api.contacts[key];
    if (api && api.settings && api.settings[key] !== undefined) return api.settings[key];
    const map = {
      phone: this.contacts.phone,
      email: this.contacts.email,
      telegram: this.contacts.telegram,
      vk: this.contacts.vk,
      max_url: this.contacts.max,
      work_hours: this.contacts.workHours,
      address: this.company.legalAddress,
    };
    return map[key] || '';
  },

  /**
   * Get setting value: prefer API, fallback to CONFIG.
   */
  getSetting(key) {
    const api = this._apiData;
    if (api && api.settings && api.settings[key] !== undefined) return api.settings[key];
    return '';
  },
};
