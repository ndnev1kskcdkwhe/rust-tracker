# Rust Tracker

Сайт для гравців Rust: пошук інформації про гравців і сервери + ігрові калькулятори.
Деталі проєкту, фази розробки та правила роботи — у [CLAUDE.md](./CLAUDE.md).

## Стек

- Next.js 16 (App Router) + TypeScript + Tailwind CSS 4
- Prisma 7 (`@prisma/adapter-pg`) + PostgreSQL
- Auth.js / NextAuth v5 (Credentials: email + пароль, і Steam через OpenID 2.0)

## Запуск локально

### 1. Встановити залежності

```bash
npm install
```

**Про вхід через Steam:** реалізовано вручну (`src/lib/auth/steamOpenId.ts` +
`src/app/api/auth/steam/{login,callback}/route.ts`), без стороннього npm-пакета.
Steam видає вхід через **OpenID 2.0**, не OAuth — пакет `authjs-steam-provider` намагався
видати цей потік за OAuth через кастомний хук `token.conform`, але `@auth/core@0.41.3`
(поточна версія в проєкті) виконує справжній обмін коду на токен ще до виклику цього хука,
а в колбеку від Steam взагалі немає параметра `code` — падало з
`OperationProcessingError: no authorization code in "callbackParameters"` (перевірено живою
спробою входу). Це структурна несумісність підходу пакета з цією версією `@auth/core`, а не
проблема конфігурації, тому власна реалізація протоколу напряму — а не пошук іншого пакета
з тим самим трюком.

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
- `STEAM_API_KEY` — [steamcommunity.com/dev/apikey](https://steamcommunity.com/dev/apikey), потрібен для Фази 3
- `BATTLEMETRICS_API_KEY` — наразі не використовується (див. розділ про Фазу 3 нижче)

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
- `PlayerCache` — кеш об'єднаного профілю гравця (Steam + BattleMetrics, коли буде доступний), TTL 30 хв (Фаза 3)

Схема: [prisma/schema.prisma](./prisma/schema.prisma)

## Калькулятор генетики рослин і сканування з екрана

`/calculators/genetics` — прогноз схрещування (формула зі rustbreeder.com / irust.ru/genetic)
+ збереження власних клонів у базу. `/calculators/genetics/scan` дозволяє захопити екран
через Screen Capture API браузера і розпізнавати геном з підказки гри через OCR (tesseract.js).

**Обов'язкова умова для сканування:** у Rust (Settings → User Interface) виставити
**User Interface Scale = 1 (максимум)** і мову інтерфейсу — English. Розпізнавання
калібрується під ці параметри.

## Пошук гравців (Фаза 3)

`/players` — пошук за SteamID64, посиланням на профіль (steamcommunity.com/profiles/... або
/id/...) чи vanity-ім'ям. Дані зі Steam Web API (профіль, аватар, VAC/game/community-бани,
години в Rust — `null`, якщо власник приховав ігрову бібліотеку в приватності) кешуються в
`PlayerCache` на 30 хв, щоб повторний пошук того самого гравця не бив по Steam API щоразу.

**BattleMetrics наразі не підключено.** Перевірено живими запитами (2026-07-30): їхній API
тепер вимагає платної підписки для будь-яких запитів, включно з неавтентифікованими —
навіть базовий пошук серверів повертає `403 Forbidden: "A subscription is required to use
the API"`. DTO (`src/lib/players/types.ts`) вже має заготовлену секцію `battlemetrics` для
історії імен/сесій/серверів — щойно буде підписка, лишиться написати клієнт і заповнити цю
секцію, без переробки решти коду чи UI.

## Статус фаз

- [x] Фаза 1 — каркас (Next.js, Prisma, Postgres, auth)
- [x] Фаза 2 — калькулятори (рейд, генетика рослин зі скануванням екрана)
- [x] Фаза 3 — пошук гравців (тільки Steam; BattleMetrics заблокований підпискою з їхнього боку)
- [ ] Фаза 4 — сервери і мапи (BattleMetrics + RustMaps)
- [ ] Фаза 5 — підписки (Stripe)
- [ ] Фаза 6 — алерти (Rust+ Companion API)

Зовнішні API-ключі для наступних фаз — у таблиці в [CLAUDE.md](./CLAUDE.md#зовнішні-api).
Жоден ключ не комітиться в git — усе через `.env.local`.
