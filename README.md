# НАРБЕРА — Юридический лендинг с админ-панелью

Полноценный адаптивный лендинг для юридической компании + защищённая админ-панель для управления контентом.

## Архитектура

```
Cloudflare Pages (статика) + Cloudflare Workers (API) + D1 (БД) + R2 (изображения)
```

- **Публичный сайт** — HTML/CSS/JS, загружается на Cloudflare Pages
- **Админ-панель** — SPA на vanilla JS, доступна по `/admin`
- **API** — Cloudflare Pages Function в `functions/api/[[path]].js`
- **База данных** — Cloudflare D1 (SQLite)
- **Изображения** — Cloudflare R2

## Структура проекта

```
/
├── index.html              # Публичный лендинг
├── privacy.html            # Политика конфиденциальности
├── consent.html            # Согласие на обработку данных
├── css/style.css           # Стили лендинга
├── js/
│   ├── config.js           # Конфигурация (контакты, SEO)
│   └── main.js             # Интерактивность лендинга
├── images/                 # Изображения
├── admin/
│   ├── index.html          # Админ-панель (SPA)
│   ├── css/admin.css       # Стили админки
│   └── js/admin.js         # Логика админки
├── functions/
│   └── api/
│       └── [[path]].js     # API (Pages Function)
├── database/
│   ├── schema.sql          # Структура базы D1
│   └── seed.sql            # Демо-данные
├── wrangler.toml           # Конфигурация Cloudflare
├── package.json
├── .gitignore
└── README.md
```

---

## Быстрый старт

### 1. Клонируйте репозиторий

```bash
git clone https://github.com/tesey4ik11-cmyk/Yurist.git
cd Yurist
npm install
```

### 2. Настройте Cloudflare Pages (Dashboard)

1. **Cloudflare Dashboard** → **Workers & Pages** → **Create a project**
2. Подключите GitHub-репозиторий `tesey4ik11-cmyk/Yurist`
3. При настройке:
   - **Production branch**: `main`
   - **Build command**: оставьте **пустым**
   - **Build output directory**: `.`
4. Нажмите **Save and Deploy**

> **Важно**: НЕ используйте `wrangler deploy` — это для Workers. Pages проекты используют `wrangler pages deploy`.

### 3. Установите Wrangler (Cloudflare CLI)

```bash
npm install -g wrangler
wrangler login
```

### 3. Создайте D1 базу данных

```bash
wrangler d1 create narbera-db
```

Скопируйте `database_id` из вывода и вставьте в `wrangler.toml`:
```toml
[[d1_databases]]
binding = "DB"
database_name = "narbera-db"
database_id = "ваш_id_здесь"
```

### 4. Инициализируйте базу данных

```bash
wrangler d1 execute narbera-db --remote --file=database/schema.sql
wrangler d1 execute narbera-db --remote --file=database/seed.sql
```

### 5. Создайте R2_BUCKET

```bash
wrangler r2 bucket create narbera-images
```

### 6. Установите секреты

```bash
# Хеш пароля (SHA-256). Сгенерируйте:
node -e "require('crypto').createHash('sha256').update('ваш_пароль').digest('hex')"

wrangler pages secret put ADMIN_EMAIL
wrangler pages secret put ADMIN_PASSWORD_HASH
wrangler pages secret put JWT_SECRET
wrangler pages secret put NOTIFY_EMAIL
```

Переменные:
- `ADMIN_EMAIL` — email администратора
- `ADMIN_PASSWORD_HASH` — SHA-256 хеш пароля
- `JWT_SECRET` — секретный ключ для JWT (случайная строка, минимум 32 символа)
- `NOTIFY_EMAIL` — email для уведомлений о заявках

### 7. Запустите локально

```bash
npm run dev
```

Откройте `http://localhost:8788`

### 8. Развёртывание

```bash
npm run deploy
```

---

## Админ-панель

### Доступ

Откройте `/admin` на вашем сайте.

### Авторизация

- Email: значение `ADMIN_EMAIL`
- Пароль: исходный текст пароля (не хеш)

### Возможности

- **Дашборд** — статистика и последние заявки
- **Первый экран** — заголовок, подзаголовок, кнопки
- **О компании** — описание эксперта
- **Услуги** — CRUD с排序 и активностью
- **Преимущества** — добавление, редактирование, порядок
- **Эксперт** — имя, фото, описание, статистика
- **Этапы работы** — номера, названия, описания
- **Кейсы** — ситуации, решения, результаты, демо-метка
- **Отзывы** — имя, город, текст, рейтинг, демо-метка
- **FAQ** — вопросы и ответы
- **Заявки** — таблица с статусами (Новая/В работе/Завершена/Архив)
- **Контакты** — телефон, email, соцсети
- **SEO** — title, description, OG, favicon, canonical
- **Настройки** — название, цвета, переключатели отображения

### Заявки

При отправке формы на публичном сайте:
1. Заявка сохраняется в D1
2. Если настроен `RESEND_API_KEY`, отправляется email-уведомление

Для настройки email через Resend:
```bash
wrangler pages secret put RESEND_API_KEY
```

---

## API Эндпоинты

### Публичные (без авторизации)

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/site` | Все данные сайта |
| GET | `/api/services` | Услуги |
| GET | `/api/advantages` | Преимущества |
| GET | `/api/steps` | Этапы работы |
| GET | `/api/cases` | Кейсы |
| GET | `/api/reviews` | Отзывы |
| GET | `/api/faq` | FAQ |
| GET | `/api/contacts` | Контакты |
| POST | `/api/inquiries` | Отправка заявки |

### Административные (требуют Bearer токен)

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/admin/login` | Авторизация |
| GET | `/api/admin/me` | Проверка токена |
| GET | `/api/admin/dashboard` | Статистика |
| GET/PUT | `/api/admin/settings` | Настройки |
| CRUD | `/api/admin/services` | Услуги |
| CRUD | `/api/admin/advantages` | Преимущества |
| CRUD | `/api/admin/steps` | Этапы |
| CRUD | `/api/admin/cases` | Кейсы |
| CRUD | `/api/admin/reviews` | Отзывы |
| CRUD | `/api/admin/faq` | FAQ |
| GET/PUT | `/api/admin/expert` | Эксперт |
| GET/PUT | `/api/admin/contacts` | Контакты |
| GET/PUT | `/api/admin/seo` | SEO |
| GET/PUT/DELETE | `/api/admin/inquiries` | Заявки |
| POST | `/api/admin/upload` | Загрузка изображений в R2 |

---

## Изменение данных

### Через админку

1. Войдите в `/admin`
2. Выберите нужный раздел
3. Внесите изменения
4. Нажмите «Сохранить»

### Напрямую в D1

```bash
wrangler d1 execute narbera-db --remote --command "SELECT * FROM settings"
```

---

## Демо-данные

При первом запуске автоматически создаются:
- 6 услуг
- 6 преимуществ
- 5 этапов работы
- 6 вопросов FAQ
- 3 кейса (помечены как «демо»)
- 3 отзыва (помечены как «демо»)
- Настройки сайта
- Контакты
- SEO

Все демо-данные помечены соответствующими метками.

---

## Обновление проекта

```bash
git pull origin main
npm run deploy
```

При обновлении структуры базы:
```bash
wrangler d1 execute narbera-db --remote --file=database/schema.sql
```

---

## Технологии

- HTML5 + CSS3 + Vanilla JavaScript
- Cloudflare Pages (хостинг статики)
- Cloudflare Pages Functions (API)
- Cloudflare D1 (SQLite в облаке)
- Cloudflare R2 (хранилище изображений)
- Google Fonts (Inter)
- 0 внешних зависимостей в frontend
