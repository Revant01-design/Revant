# Revant — Static MVP (Vercel Ready)

Versión 100% frontend de Revant, sin backend. Datos demo persistidos en `localStorage` del navegador. Lista para desplegar en Vercel en 2 clics.

## ¿Qué incluye?
- Login email + contraseña (cuentas demo precargadas)
- Dashboard con KPIs + 3 charts (línea de ingresos, donut de estatus, barras por propiedad)
- Rent Roll con búsqueda, filtros, edición de estatus en línea y **bulk operations**
- Contract Viewer con **firma digital canvas** y **PDF cliente-side** (jsPDF)
- ARCO público y panel admin (LFPDPPP)
- Audit log de acciones
- Recordatorios y ligas de pago **simuladas** (toasts informativos)
- `/payment-success` que confirma el pago automáticamente en modo demo
- Switcher de roles Admin / Inquilino

## Cuentas demo (precargadas en localStorage)
| Email | Contraseña | Rol |
|---|---|---|
| `admin@revant.mx` | `Revant2026!` | admin |
| `jorge.tenant@revant.mx` | `Inquilino2026!` | inquilino |

> Botones de acceso rápido en la pantalla de login.

## Para limpiar el estado demo
Abre DevTools → Application → Local Storage → borra la clave `revant_demo_state_v1`. Recarga la página y todo regresa al seed inicial.

## Despliegue a Vercel (3 minutos)

### Opción 1 — UI Web
1. Sube `/app/static-mvp` a un repo de GitHub
2. En https://vercel.com/new selecciona el repo
3. Vercel detecta automáticamente Create React App (gracias a `vercel.json`). Da clic en **Deploy**.
4. Cuando termine, conecta tu dominio GoDaddy en **Settings → Domains** y sigue las instrucciones de DNS

### Opción 2 — CLI
```bash
npm install -g vercel
cd /app/static-mvp
vercel --prod
```

### Conectar dominio GoDaddy
- En Vercel → Settings → Domains → añade `revant.tudominio.com`
- En GoDaddy → DNS → añade los registros que Vercel te indique:
  - Para apex (ej. `tudominio.com`): A record `76.76.21.21`
  - Para subdominio (ej. `app.tudominio.com`): CNAME `cname.vercel-dns.com`

## Migración futura a backend real
Cuando Magokoro implemente el backend real (la versión full-stack ya está en `/app/backend`), basta con:
1. Reemplazar `/src/lib/api.js` por la versión axios original (preservada en `/app/frontend/src/lib/api.js`)
2. Configurar `REACT_APP_BACKEND_URL` en Vercel → Settings → Environment Variables
3. Redeploy

Toda la estructura de componentes, rutas y data shapes ya coincide con la API real, así que **no hay cambios en componentes**.

## Stack técnico
- React 19 (CRA + craco)
- Tailwind CSS + shadcn/ui
- React Router v7
- Recharts (gráficas)
- jsPDF (generación de PDF cliente-side)
- Sonner (toasts)
- lucide-react (iconos)
- Manrope + Outfit (Google Fonts)

## Limitaciones del modo demo
- Los datos viven solo en el navegador del usuario actual (no se sincronizan entre dispositivos)
- Recordatorios por email son **simulados** (no se envían correos reales)
- Stripe Checkout es **simulado** (la liga lleva directo a `/payment-success` que marca el contrato como pagado)
- Forgot password no envía email real
- No hay multi-usuario real (cada navegador es un cliente independiente)

Para producción real con backend, ver `/app/backend` y `/app/frontend` en el repo principal.
