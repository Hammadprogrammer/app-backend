# HIFATZAT — Emergency Safety App

Complete documentation: architecture, setup, environment variables, API reference, and how every feature works.

---

## 1. Project Overview

HIFATZAT is a personal-safety / emergency-alert system with three parts:

- **Backend API** — Node.js + Express + TypeScript + Prisma (PostgreSQL/NeonDB). Handles auth (OTP), contacts, SOS alerts, check-ins, trips, streaks, settings, and sends SMS/WhatsApp notifications.
- **Web test UI** — `public/index.html`, served by the backend at `http://localhost:4000`. A single-page dashboard to test every feature without the mobile app.
- **Mobile app** — React Native app in `MyApp/` (separate repo). Talks to the same API.

---

## 2. Tech Stack

| Layer | Tech |
|---|---|
| Runtime | Node.js, Express |
| Language | TypeScript (`strict`) |
| DB | PostgreSQL (NeonDB) via Prisma ORM |
| Cache/OTP store | Upstash Redis (REST) with in-memory fallback |
| Auth | JWT (7d) + OTP login |
| SMS | Twilio / generic gateway / mock (env-driven) |
| WhatsApp | Meta Cloud API / Twilio / mock (env-driven) |
| Mobile | React Native 0.87, axios |

---

## 3. Project Structure

```
app backend/
├── backend/                    # All backend code + web test UI
│   ├── api/index.ts            # Vercel serverless entry point
│   ├── vercel.json             # Vercel build config (prisma generate + tsc)
│   ├── prisma/schema.prisma    # DB models
│   ├── public/index.html       # Web test dashboard (served at /)
│   ├── scripts/test-features.ps1 # End-to-end API test script
│   ├── src/
│   │   ├── server.ts           # Express app, route mounting, /health
│   │   ├── lib/
│   │   │   ├── phone.ts        # E.164 phone normalization (+92 default)
│   │   │   └── dates.ts        # Date helpers (day boundaries, streaks)
│   │   ├── middleware/         # JWT auth, SOS rate limiter
│   │   ├── services/
│   │   │   ├── sms.service.ts      # SMS provider selection + send
│   │   │   ├── whatsapp.service.ts # WhatsApp provider selection + send
│   │   │   ├── otp.service.ts      # OTP issue/verify + delivery
│   │   │   └── twilio.client.ts    # Minimal Twilio REST client
│   │   ├── controllers/        # auth, contact, alert, checkin, trip, settings, streak
│   │   └── routes/             # Express routers per resource
│   └── package.json / tsconfig.json / .env.example
└── MyApp/                      # React Native mobile app
```

---

## 4. Setup

```bash
cd backend
npm install
npx prisma generate
npx prisma db push        # or migrate deploy
npm run dev               # ts-node-dev on :4000
```

Web dashboard: `http://localhost:4000`
Health check: `GET /health` → reports active providers.

---

## 5. Environment Variables

Copy `.env.example` → `.env` and fill values. **Everything is env-driven — no code changes needed to go live.**

### Server & DB
| Var | Purpose |
|---|---|
| `PORT` | API port (default 4000) |
| `DATABASE_URL` | NeonDB Postgres connection string |
| `JWT_SECRET` | JWT signing secret |
| `JWT_EXPIRES_IN` | Token lifetime (default `7d`) |
| `DEFAULT_COUNTRY_CODE` | Prefix for numbers without country code (e.g. `+92`) |

### OTP
| Var | Purpose |
|---|---|
| `OTP_MODE` | `auto` (live if a provider is configured, else static) \| `live` \| `static` |
| `OTP_CHANNEL` | `both` \| `sms` \| `whatsapp` |
| `OTP_TTL_SECONDS` | OTP expiry (default 300) |
| `STATIC_OTP` | Dev fallback code (`123456`) |

### SMS
| Var | Purpose |
|---|---|
| `SMS_PROVIDER` | `auto` \| `twilio` \| `gateway` \| `mock` |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` | Twilio credentials |
| `TWILIO_FROM` | Twilio sender number |
| `TWILIO_MESSAGING_SERVICE_SID` | Optional; overrides `TWILIO_FROM` |
| `SMS_GATEWAY_URL` / `SMS_GATEWAY_API_KEY` | Generic REST gateway (POST `{to, message}` + Bearer) |

### WhatsApp
| Var | Purpose |
|---|---|
| `WHATSAPP_PROVIDER` | `auto` \| `meta` \| `twilio` \| `mock` |
| `WHATSAPP_API_VERSION` | Meta Graph API version (`v21.0`) |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta sender phone-number ID |
| `WHATSAPP_ACCESS_TOKEN` | Meta access token |
| `WHATSAPP_TEMPLATE_NAME` | Approved template for business-initiated msgs (one `{{1}}` param) |
| `WHATSAPP_TEMPLATE_LANG` | Template language (default `en`) |
| `TWILIO_WHATSAPP_FROM` | Twilio WhatsApp sender, e.g. `whatsapp:+14155238886` |

### Redis
| Var | Purpose |
|---|---|
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | OTP store + SOS rate limiting |

---

## 6. How Messaging Works

### Provider resolution (`auto` mode)
- **SMS**: `twilio` if `TWILIO_ACCOUNT_SID`+`TWILIO_AUTH_TOKEN`+(`TWILIO_FROM` or `TWILIO_MESSAGING_SERVICE_SID`) → else `gateway` if `SMS_GATEWAY_URL` → else `mock` (console log).
- **WhatsApp**: `meta` if `WHATSAPP_PHONE_NUMBER_ID`+`WHATSAPP_ACCESS_TOKEN` → else `twilio` if `TWILIO_WHATSAPP_FROM`+creds → else `mock`.
- `mock` logs the message to the server console — safe for dev.

### Phone normalization (`src/lib/phone.ts`)
All numbers are normalized to E.164 before storing/sending. `03001234567` → `+923001234567` using `DEFAULT_COUNTRY_CODE`. WhatsApp numbers get the `whatsapp:` prefix for Twilio.

### OTP flow (`src/services/otp.service.ts`)
1. `POST /api/auth/login` → `issueOtp(phone)`
2. If `OTP_MODE=live` (or `auto` + a real provider configured): random 6-digit code generated, stored in Redis (or memory) with TTL, sent via `OTP_CHANNEL`.
3. If static mode / no provider: `STATIC_OTP` is used; response includes `devCode` in development.
4. `POST /api/auth/verify-otp` → verifies code → returns JWT.
5. If delivery fails and no `devCode`, API returns `502` with the provider error.

### Where messages are sent
- **SOS alert trigger** → all emergency contacts get SMS + WhatsApp with location.
- **Alert cancel / "I'm safe"** → contacts notified.
- **Check-in marked "not safe"** → contacts notified.
- **Trip overdue** → contacts notified.
- **Login OTP** → user via configured channel.

---

## 7. API Reference

All routes except `/api/auth/*` and `/health` require `Authorization: Bearer <jwt>`.

### Auth — `/api/auth`
| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/signup` | `{name, phone, password?}` | Phone normalized to E.164 |
| POST | `/login` | `{phone}` | Issues OTP; returns `{delivered, devCode?}` |
| POST | `/verify-otp` | `{phone, code}` | Returns `{token, user}` |

### Contacts — `/api/contacts` (max 2)
| Method | Path | Notes |
|---|---|---|
| GET | `/` | List emergency contacts |
| POST | `/` | `{name, phone, priority?}` — phone normalized |
| DELETE | `/:id` | Remove contact |

### Alerts — `/api/alerts`
| Method | Path | Notes |
|---|---|---|
| POST | `/trigger` | `{lat, lng, source?}` — rate-limited via Redis; notifies contacts |
| GET | `/history` | Past alerts |
| GET | `/active` | Currently active alert (or null) |
| GET | `/:id` | Alert detail |
| POST | `/:id/cancel` | False alarm → status `cancelled`, notifies contacts |
| POST | `/:id/safe` | "I'm safe" → status `resolved`, notifies contacts |
| POST | `/:id/location` | `{lat, lng}` — append live location point |
| GET | `/:id/locations` | Location trail for an alert |

### Check-ins — `/api/checkins`
| Method | Path | Notes |
|---|---|---|
| GET | `/` | Today's check-ins |
| GET | `/history` | Past check-ins |
| POST | `/` | `{status: safe\|not_safe}` — `not_safe` notifies contacts |
| GET | `/alarms` | Scheduled check-in alarms |
| PUT | `/alarms/:id` | Update alarm `{time, enabled, ...}` |
| GET | `/score` | Safety score (0–100) from check-in/alert history |

### Trips — `/api/trips`
| Method | Path | Notes |
|---|---|---|
| GET | `/` | Trip list |
| GET | `/active` | Current trip |
| POST | `/` | `{destination, etaMinutes, ...}` — start trip |
| POST | `/:id/end` | End trip |
| POST | `/:id/overdue` | Notify contacts that trip is overdue |

### Settings & Streak
| Method | Path | Notes |
|---|---|---|
| GET/PUT | `/api/settings` | User preferences (toggles, defaults) |
| GET | `/api/streak` | Current/longest safe-days streak + milestones |

### Health
`GET /health` → `{status, providers: {sms, whatsapp, otp, redis}}` — use this to confirm env config took effect.

---

## 8. Database Models (`prisma/schema.prisma`)

- **User** — name, phone (E.164, unique), password hash
- **Contact** — emergency contacts (max 2 enforced), priority
- **Alert** — status `active|cancelled|resolved`, source, location
- **AlertLocation** — live location trail per alert
- **Checkin** — daily safe/not-safe check-ins
- **AlarmSchedule** — scheduled check-in reminders
- **Trip** — destination, ETA, active/ended, overdue flag
- **Settings** — per-user feature toggles
- **UserStreak** — current/longest streak, milestones

---

## 9. Web Dashboard (`public/index.html`)

Single-page test UI served at `/`. Tabs:

- **Home** — SOS trigger, active-alert banner (Cancel / I'm Safe + live location sharing), alert history
- **Safety** — safety score, check-in button, alarms, streak, trip mode
- **Features** — settings toggles, fake call, siren, quick tools
- **Contacts** — add/remove emergency contacts
- **Auth** — signup/login/OTP

Uses `fetch` against the same API; stores JWT in `localStorage`.

---

## 10. Mobile App (`MyApp/`)

React Native app mirroring the web features:

- `src/api/client.ts` — axios client; base URL per platform (`10.0.2.2` for Android emulator)
- `src/screens/` — `HomeScreen` (SOS + active-alert banner), `SafetyScreen` (score/alarms/checkins/streak/trips), `FeaturesScreen` (toggles/tools), auth screens
- `App.tsx` — splash, auth gate, drawer + tab navigation

Run: `cd MyApp && npm start` (Metro :8081), then `npm run android` with an emulator/device.

---

## 11. Deployment Checklist

1. Set all env vars from `.env.example` on the host (Railway/Render/VPS).
2. `npm ci && npx prisma generate && npx prisma migrate deploy`
3. `npm run build && npm start` (or run `ts-node`/`tsx` directly).
4. Verify `GET /health` shows `sms`, `whatsapp`, `otp` as expected (`live`/`meta`/`twilio`, not `mock`/`static`).
5. Test login OTP end-to-end with a real phone number.

### Meta WhatsApp notes
- Free-text messages only work inside the 24h user-initiated window. For business-initiated messages (SOS to contacts), set `WHATSAPP_TEMPLATE_NAME` to an approved template with one `{{1}}` body param.
- Alternative: Twilio WhatsApp sandbox/approved sender via `TWILIO_WHATSAPP_FROM`.

---

## 12. Testing

```powershell
# Backend typecheck (run from backend/)
cd backend; npx tsc --noEmit

# End-to-end API test (server must be running)
./backend/scripts/test-features.ps1

# Health / provider check
Invoke-RestMethod http://localhost:4000/health
```

Git: repo → `github.com/Hammadprogrammer/app-backend` (branch `main`). Backend code lives in `backend/`, mobile app in `MyApp/`. `.env` is gitignored.
