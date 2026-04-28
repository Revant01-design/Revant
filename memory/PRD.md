# PRD – Revant PropTech Dashboard

## Original Problem Statement
Build the functional core of the Revant Dashboard (PropTech/FinTech for the Mexican market): React + Tailwind + FastAPI + MongoDB. Visual identity: white background #FFFFFF, navy primary #031433, champagne gold accent #D3A154, modern geometric sans-serif. Modules: (A) auth + personalized greeting + Admin/Tenant roles, (B) dynamic Rent Roll with statuses Paid/Pending/Overdue and auto-sum of "Rentas Cobradas", (C) digital contract viewer with simulated digital signature, (D) 4 KPI cards (Ingresos, Ocupación, Contratos por Vencer <30d, Tasa de Morosidad). Smooth hover, full responsiveness, ready for SQL/LFPDPPP integration.

## User Choices (verbatim)
- Login: Emergent-managed Google OAuth
- Demo data preloaded: yes
- Digital signature: button + simulated validation
- UI 100% in Spanish
- Roles: Admin (full portfolio) and Inquilino (own contract only)

## Architecture
- Backend: FastAPI (`/api/*`) + MongoDB (Motor). Auth via Emergent OAuth `/auth/v1/env/oauth/session-data`, session token stored in httpOnly secure cookie (7 days) and `user_sessions` collection. RBAC by `user.role`.
- Frontend: React 19, React Router v7, Tailwind, shadcn/ui, sonner toasts, lucide-react icons. Fonts: Manrope (display) + Outfit (body) via Google Fonts. AuthContext + ProtectedRoute pattern. Hash-based `session_id` callback handled before protected routes.

## Personas
- **Administrador**: portfolio owner – sees all properties, contracts, KPIs; can change payment status of contracts.
- **Inquilino**: tenant – sees only their own contract & KPIs; can sign their pending contract.

## Implemented (Feb 2026)
- Login screen with Google OAuth + LFPDPPP notice
- AuthContext + AuthCallback (race-condition safe, no `/me` during hash callback)
- Sidebar + Topbar with profile dropdown and role switcher
- Dashboard: personalized greeting, 4 live KPI cards, upcoming-vencimientos list
- Rent Roll: searchable/filterable table, dynamic status badges (Paid/Pending/Overdue), auto-summed Rentas Cobradas, in-row status edit (admin)
- Contracts: card grid + ContractViewer modal with legal preview (Mexican CCF references) + simulated digital signature
- Properties: image grid (CDMX + Monterrey demo set)
- Auto-seeded demo (6 properties, 5 contracts mixed statuses)

## Backlog
- P1: Real signature canvas, PDF export, Stripe payments, multi-tenant org accounts
- P1: Email notifications for upcoming vencimientos (Resend/SendGrid)
- P2: Charts (Recharts) for cashflow trends, occupancy timeline
- P2: SQL migration layer, audit log, ARCO requests workflow (LFPDPPP)
- P2: Bilingual EN/ES toggle, dark mode

## Validation
- Backend: 16/16 pytest passing (auth, RBAC, CRUD, signing, KPIs)
- Frontend: 100% smoke tests via testing agent (cookie-injected sessions for admin + tenant)
