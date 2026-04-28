# Estado del Preview — Revant

**Hoy (reunión Cincel):** Preview público sirve la **versión estática MVP** desde `/app/static-mvp/build`.

URL: https://property-admin-89.preview.emergentagent.com

Cuentas demo precargadas (botones de quick-fill en el login):
- Admin: `admin@revant.mx` / `Revant2026!`
- Inquilino: `jorge.tenant@revant.mx` / `Inquilino2026!`

## ¿Cómo está corriendo?
- Dev frontend (`yarn start`) está **detenido** vía `supervisorctl stop frontend`
- El build estático se sirve con `npx serve` desde `/app/static-mvp/build` en port 3000
- Auto-restart: `/app/static-mvp/serve-loop.sh` corre en loop bash + nohup

## Cómo restaurar el preview a la versión full-stack (cuando llegue Magokoro)

Pídeme: **"Restaura el preview al full-stack"** y ejecutaré:
```bash
pkill -f "serve-loop"
pkill -f "serve.*-l 3000"
sudo supervisorctl start frontend
```
En 30 segundos vuelve la versión completa con backend FastAPI + Stripe + Gmail + MongoDB.

## Para desplegar a Vercel (cuando estés listo)
1. Sube `/app/static-mvp` a GitHub (botón "Save to GitHub" en Emergent)
2. https://vercel.com/new → importa repo → Deploy
3. Conecta dominio GoDaddy en Settings → Domains
