# Rust Tracker

Сайт для гравців Rust: пошук інформації про гравців і сервери + ігрові калькулятори.
Деталі проєкту, фази розробки та правила роботи — у [CLAUDE.md](./CLAUDE.md).

## Стек

- Next.js 16 (App Router) + TypeScript + Tailwind CSS 4
- Prisma 7 (`@prisma/adapter-pg`) + PostgreSQL
- Auth.js / NextAuth v5 (Credentials: email + пароль)

## Запуск локально

### 1. Встановити залежності

```bash
npm install
```

### 2. Підняти PostgreSQL

Варіант A — локальна dev-база від самого Prisma (не потребує Docker чи встановленого Postgres):

```bash
npx prisma dev
```

Команда виведе рядок підключення (`postgres://...`) — встав його як `DATABASE_URL` у `.env`/`.env.local`.
Щоб сервер жив у фоні між сесіями: `npx prisma dev --detach`. Список активних: `npx prisma dev ls`.

Варіант B — власний Postgres (локальний, Docker або хмарний: Supabase / Neon / Railway) —
просто вкажи його `DATABASE_URL` у `.env.local`.

### 3. Налаштувати змінні середовища

Скопіюй `.env.example` у `.env` і заповни (саме `.env` — його читають і Next.js, і Prisma CLI/`prisma.config.ts`):

```bash
cp .env.example .env
```

- `DATABASE_URL` — рядок підключення до Postgres
- `NEXTAUTH_SECRET` — будь-який випадковий рядок (`openssl rand -base64 32`)
- `NEXTAUTH_URL` — `http://localhost:3000` для локальної розробки

### 4. Прогнати міграції та згенерувати Prisma Client

```bash
npx prisma migrate dev
npx prisma generate
```

**Відома проблема з `npx prisma dev` (Варіант A):** цей локальний движок дзеркалить схему
в будь-яку нову базу на тому самому інстансі (через власний WAL-механізм), тож повноцінної
"порожньої" shadow-бази для `migrate dev` там не існує — команда може впасти з `P3018`
(`type ... already exists`) або `P3005` (`database schema is not empty`). Обхід, якщо це
станеться:

```bash
# 1. Згенерувати SQL діффу напряму зі схем (без підключення до shadow-бази)
git show HEAD:prisma/schema.prisma > /tmp/schema_before.prisma
npx prisma migrate diff --from-schema /tmp/schema_before.prisma --to-schema prisma/schema.prisma --script > prisma/migrations/<timestamp>_<name>/migration.sql

# 2. Якщо БД вже має таблиці без historyю міграцій — розбаселайнити:
npx prisma migrate resolve --applied <назва_попередньої_міграції>

# 3. Застосувати нову міграцію (не потребує shadow-бази)
npx prisma migrate deploy
```

Із власним Postgres (Варіант B) ця проблема не виникає — там `migrate dev` працює штатно.

### 5. Запустити dev-сервер

```bash
npm run dev
```

Відкрий [http://localhost:3000](http://localhost:3000). На головній сторінці — вхід/реєстрація
(email + пароль). Після реєстрації користувачу автоматично створюється `Subscription` рівня `FREE`.

## Структура даних (Фаза 1)

- `User` — email, хеш пароля (bcrypt), ім'я
- `Subscription` — рівень (`FREE`/`PRO`), статус, поля під Stripe (заповнюються у Фазі 5)
- `PlantGenome` — збережені клони рослин (культура, 6-літерний геном, нотатка) для калькулятора генетики (Фаза 2)

Схема: [prisma/schema.prisma](./prisma/schema.prisma)

## Калькулятор генетики рослин і сканування з екрана

`/calculators/genetics` — прогноз схрещування (формула зі rustbreeder.com / irust.ru/genetic)
+ збереження власних клонів у базу. `/calculators/genetics/scan` дозволяє захопити екран
через Screen Capture API браузера і розпізнавати геном з підказки гри через OCR (tesseract.js).

**Обов'язкова умова для сканування:** у Rust (Settings → User Interface) виставити
**User Interface Scale = 1 (максимум)** і мову інтерфейсу — English. Розпізнавання
калібрується під ці параметри.

## Статус фаз

- [x] Фаза 1 — каркас (Next.js, Prisma, Postgres, auth)
- [x] Фаза 2 — калькулятори (рейд, генетика рослин зі скануванням екрана)
- [ ] Фаза 3 — пошук гравців (Steam + BattleMetrics)
- [ ] Фаза 4 — сервери і мапи (BattleMetrics + RustMaps)
- [ ] Фаза 5 — підписки (Stripe)
- [ ] Фаза 6 — алерти (Rust+ Companion API)

Зовнішні API-ключі для наступних фаз — у таблиці в [CLAUDE.md](./CLAUDE.md#зовнішні-api).
Жоден ключ не комітиться в git — усе через `.env.local`.
