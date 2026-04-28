# PRD – Revant PropTech Dashboard

## Original Problem Statement
PropTech/FinTech dashboard for the Mexican market. White #FFFFFF, navy #031433, gold #D3A154. Modules: auth + roles, Rent Roll dynamic, contract viewer + signature, KPI dashboard.

## Two parallel deliverables now live in /app

### 1. Full-stack version (`/app/frontend` + `/app/backend`)
For Magokoro agency hand-off. Production-grade FastAPI + MongoDB.
- Email/password + Google OAuth (bcrypt + sessions)
- ReportLab server PDF
- Real Gmail SMTP (App Password configured: jorge.ortiz.sandoval.2010@gmail.com)
- Stripe Checkout (test key `sk_test_emergent`) — one-time + multi-month
- ARCO LFPDPPP full flow + Audit log
- Brute-force protection, forgot/reset password
- Bulk operations on Rent Roll
- Webhook IP logging
- Recharts dashboard

### 2. Static MVP version (`/app/static-mvp`)
For Cincel proveedor demo today. 100% frontend, mocked API in `lib/api.js`, persists to localStorage.
- All same UI/flows
- jsPDF client-side PDF
- Simulated Stripe (auto-pays on `/payment-success` polling)
- Demo accounts pre-seeded
- Vercel-ready (`vercel.json` + `README.md` with deploy steps)

## Personas
- Administrador: full portfolio
- Inquilino: own contract

## Validation
- Iter 1-3 (full-stack): all passing (16+22+17 backend pytest, frontend Playwright)
- Iter 4 (bulk + static-mvp): build success, manual e2e via screenshot (login → dashboard with charts → bulk bar visible)

## Active preview state
**Preview URL serves STATIC MVP build** (for Cincel meeting today).
Restoration command saved in `/app/memory/PREVIEW_STATE.md`.

## Backlog
- P1: Stripe Subscriptions (recurring) — needs lib extension
- P1: Rate limit cross-pod via Redis
- P2: Bilingual EN/ES, dark mode, charts trends
- P2: Magokoro hand-off doc with API contract

## Test Credentials
| Email | Password | Role |
|---|---|---|
| admin@revant.mx | Revant2026! | admin |
| jorge.tenant@revant.mx | Inquilino2026! | inquilino |

## Pending User Actions
- Push `/app/static-mvp` to GitHub & deploy to Vercel
- Connect GoDaddy domain to Vercel
- (Later) Hand-off `/app` full-stack to Magokoro
