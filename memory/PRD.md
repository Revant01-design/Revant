# PRD – Revant PropTech Dashboard

## Original Problem Statement
Build the functional core of the Revant Dashboard (PropTech/FinTech for the Mexican market). React + Tailwind + FastAPI + MongoDB. Brand: white #FFFFFF, navy #031433, gold #D3A154, geometric sans-serif. Modules: auth + roles, dynamic Rent Roll (Paid/Pending/Overdue), digital contract viewer + signature, KPI dashboard.

## User Choices
- Login: Emergent Google OAuth + Email/Password (added in iter 2)
- Demo data preloaded
- PDF generation: server-side (ReportLab)
- Signature: real canvas (added in iter 2)
- Email: Gmail SMTP App Password (pending credentials)
- Auto reminders: manual + automatic
- ARCO: complete admin tickets workflow
- UI 100% Spanish
- Roles: Administrador (full portfolio) / Inquilino (own contract)

## Architecture
- **Backend**: FastAPI `/api/*`, MongoDB (Motor), bcrypt, ReportLab, smtplib (Gmail SSL). Sessions via `session_token` cookie + `user_sessions` collection (works for both Google OAuth and email/password).
- **Frontend**: React 19, React Router v7, Tailwind, shadcn/ui, sonner, lucide-react, fonts Manrope+Outfit. AuthContext + ProtectedRoute + AdminOnly wrapper. Hash-based OAuth callback handled before protected routes.

## Personas
- **Administrador**: full portfolio, contracts CRUD, KPIs, ARCO tickets, audit log, email reminders
- **Inquilino**: own contract only; can sign with canvas; download own PDF

## Implemented (Feb 2026 — iter 1+2)
**Iter 1 (MVP)**
- Login screen, Google OAuth, role switcher
- Dashboard greeting + 4 KPIs + upcoming
- Rent Roll (search, filter, status edit, auto-sum)
- Contract grid + viewer modal
- Properties grid
- Demo seed (6 props, 5 contracts)

**Iter 2 (this iteration)**
- ✅ Email/password authentication (bcrypt) coexisting with Google OAuth (same `session_token` cookie)
- ✅ Seeded demo accounts: `admin@revant.mx / Revant2026!`, `jorge.tenant@revant.mx / Inquilino2026!`
- ✅ Real signature canvas (mouse + touch, base64 PNG embedded in DB)
- ✅ Server-side PDF (ReportLab) with embedded signature image, Mexican CCF clauses, LFPDPPP reference
- ✅ Gmail SMTP service (smtplib SSL); falls back to "simulated" mode without credentials
- ✅ Manual reminder per row (admin) + auto-run for vencimientos in next 7 days
- ✅ ARCO public form `/arco-publico` (no auth) → POST `/api/arco`; confirmation email
- ✅ ARCO admin ticket management `/arco` (estatus + notas)
- ✅ Audit log `/audit` with timestamps for: contract.sign, contract.download_pdf, reminder.send_manual, reminder.run_auto, arco.update
- ✅ Sidebar conditionally shows Admin sections (Solicitudes ARCO, Auditoría)

## Validation
- Iter 1: Backend 16/16, Frontend 100%
- Iter 2: Backend 22/22 pytest passing; Frontend verified via screenshots & testing agent (login, sidebar RBAC, ARCO public+admin, contract PDF, reminders simulated, audit page)

## Backlog
- P0: User-provided GMAIL_USER + GMAIL_APP_PASSWORD to enable real email sending
- P1: Brute-force protection on email/password login (lockout 5 fails / 15 min)
- P1: Forgot/Reset password flow
- P1: Stripe payments + auto-issue payment links in reminders
- P2: Recharts charts (cashflow, occupancy timeline)
- P2: Audit log: human-readable Spanish action labels (currently raw codes also shown)
- P2: Bulk operations on Rent Roll (mass status change, mass reminder)
- P2: SQL migration layer

## Pending User Action
Provide Gmail credentials (`GMAIL_USER`, `GMAIL_APP_PASSWORD`) to switch reminder + ARCO emails from simulated to live sending. Add to `/app/backend/.env` and restart backend.
