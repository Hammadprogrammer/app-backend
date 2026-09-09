# HIFATZAT Emergency System

Express + TypeScript backend (root) and React Native mobile app (`MyApp/`).

## Backend Setup

1. `npm install`
2. Copy `.env.example` → `.env` and fill in:
   - `DATABASE_URL` — NeonDB PostgreSQL connection string
   - `JWT_SECRET` — long random string
   - `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` — Upstash Redis (SOS rate limiting)
   - Optional: `WHATSAPP_*` (Meta Cloud API) and `SMS_*` (gateway) — both fall back to console mocks in dev
3. `npm run prisma:generate` then `npm run prisma:push` (or `prisma:migrate`)
4. `npm run dev` → API on `http://localhost:4000`

## API

| Method | Endpoint             | Auth | Description                          |
|--------|----------------------|------|--------------------------------------|
| POST   | `/api/auth/signup`   | —    | Create account (bcrypt-hashed)       |
| POST   | `/api/auth/login`    | —    | Log in, returns JWT                  |
| GET    | `/api/contacts`      | JWT  | List emergency contacts              |
| POST   | `/api/contacts`      | JWT  | Add contact (strict max 2)           |
| DELETE | `/api/contacts/:id`  | JWT  | Remove contact                       |
| POST   | `/api/alerts/trigger`| JWT  | Trigger SOS (rate limited: 5/hour)   |
| GET    | `/api/alerts/history`| JWT  | Last 50 alerts                       |

## Mobile App (`MyApp/`)

1. `cd MyApp && npm install`
2. Start backend, then `npm run android` (or `npm run ios`)
   - Android emulator reaches the backend via `10.0.2.2:4000` automatically
   - Physical device: change `BASE_URL` in `src/api/client.ts` to your machine's LAN IP
