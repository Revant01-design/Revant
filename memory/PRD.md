# PRD – Revant PropTech Dashboard

## Original Problem Statement
Build the functional core of Revant Dashboard (PropTech/FinTech, México). React + Tailwind + FastAPI + MongoDB. Brand: white #FFFFFF, navy #031433, gold #D3A154. Modules: auth + roles, Rent Roll dynamic, contract viewer + signature, KPI dashboard.

## Architecture
- **Backend**: FastAPI `/api/*`, MongoDB (Motor), bcrypt, ReportLab, smtplib (Gmail SSL), emergentintegrations Stripe Checkout, recharts series.
- **Frontend**: React 19, React Router v7, Tailwind, shadcn/ui, sonner, lucide-react, Recharts, Manrope+Outfit fonts. AuthContext + ProtectedRoute + AdminOnly wrapper.

## Personas
- **Administrador**: full portfolio, contracts CRUD, KPIs, ARCO tickets, audit log, email reminders, Stripe payment links, charts
- **Inquilino**: own contract only; canvas signature; PDF; pay via emailed link

## Implemented (Iter 1 + 2 + 3)
**Iter 1 – MVP**: Login + Google OAuth, role switcher, dashboard greeting, 4 KPIs, upcoming, Rent Roll w/ status badges, contract viewer, demo seed.

**Iter 2 – Pro features**: Email/password auth (bcrypt + same session_token cookie), real signature canvas, ReportLab PDF, Gmail SMTP service, manual + auto reminders, ARCO public form + admin tickets + LFPDPPP confirmation email, audit log, AdminOnly routes.

**Iter 3 – Enterprise + Cobranza**:
- ✅ Forgot password (anti-enumeration) + Reset password page (token via URL or paste). Email contains both clickable button (using request origin) and raw token.
- ✅ Brute-force protection: 5 fails / 15 min lockout, email-only identifier (cross-pod safe). Counter cleared on success.
- ✅ Stripe Checkout integration (test key `sk_test_emergent`):
  - POST `/api/payments/checkout` (admin) — server-side amount, `currency=mxn`, multi-month support
  - GET `/api/payments/status/{session_id}` — polling with idempotent contract.estatus → 'pagado'
  - POST `/api/webhook/stripe` — webhook with idempotent flip
  - `payment_transactions` collection
- ✅ Reminder emails embed Stripe "PAGAR AHORA" CTA when admin selects "Recordatorio + liga"
- ✅ Frontend: RentRoll dropdown with 4 cobranza actions per row (1 mes / 3 meses / recordatorio+liga / recordatorio simple)
- ✅ `/payment-success?session_id=...` polling page
- ✅ Recharts on Dashboard (admin only): Line of last 12 months ingresos cobrados, Donut of status distribution, Bars of rent per property
- ✅ Backend `/api/dashboard/series` provides aggregated chart data

## Test Credentials (auto-seeded)
| Email | Password | Role |
|---|---|---|
| admin@revant.mx | Revant2026! | admin |
| jorge.tenant@revant.mx | Inquilino2026! | inquilino |

## Validation
- Iter 1: 16/16 backend, 100% frontend
- Iter 2: 22/22 backend, 100% frontend
- Iter 3: 17/17 backend pytest, 13/13 frontend Playwright

## Backlog
- P0: User to provide GMAIL_USER + GMAIL_APP_PASSWORD to switch reminders/ARCO emails from simulated to real
- P1: Stripe **Subscriptions** mode (currently one-time per N months) — needs library extension
- P1: Centralized rate limit (Redis) for cross-pod brute-force
- P1: Webhook signature IP allowlist (Stripe production)
- P2: Bulk operations on Rent Roll (mass reminder/charge)
- P2: Multi-tenant org accounts, real-time webhooks via WebSocket
- P2: Bilingual EN/ES toggle, dark mode

## Pending User Action
Add to `/app/backend/.env` and restart backend:
```
GMAIL_USER="tu-correo@gmail.com"
GMAIL_APP_PASSWORD="xxxxxxxxxxxxxxxx"
```
