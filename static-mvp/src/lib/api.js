/* Mock API layer — drop-in replacement for axios api client.
 * Persists state in localStorage so the demo survives reloads.
 */
import { SEED_USERS, SEED_PROPERTIES, SEED_CONTRACTS } from "./seed";

const KEY = "revant_demo_state_v1";

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const fresh = {
    users: SEED_USERS.map((u) => ({ ...u })),
    sessions: {}, // token -> user_id
    properties: SEED_PROPERTIES.map((p) => ({ ...p })),
    contracts: SEED_CONTRACTS.map((c) => ({ ...c })),
    arco: [],
    audit: [],
    payments: [],
    currentToken: null,
  };
  localStorage.setItem(KEY, JSON.stringify(fresh));
  return fresh;
}

function save(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms));

function tokenGen() {
  return "mock_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function logAudit(state, user, action, target_type = "", target_id = "", details = {}) {
  state.audit.unshift({
    log_id: "log_" + Math.random().toString(36).slice(2, 14),
    user_id: user?.user_id || null,
    user_email: user?.email || null,
    user_role: user?.role || null,
    action, target_type, target_id, details,
    created_at: new Date().toISOString(),
  });
}

function currentUser(state) {
  const tok = state.currentToken;
  if (!tok) return null;
  const uid = state.sessions[tok];
  if (!uid) return null;
  return state.users.find((u) => u.user_id === uid) || null;
}

function fail(status, detail) {
  const e = new Error(detail);
  e.response = { data: { detail }, status };
  return e;
}

function daysUntilISO(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  const now = new Date();
  return Math.ceil((d - now) / 86400000);
}

const handlers = {
  async "POST /auth/login"(body, state) {
    await wait();
    const u = state.users.find((x) => x.email.toLowerCase() === body.email.toLowerCase());
    if (!u || u.password !== body.password) throw fail(401, "Correo o contraseña incorrectos");
    const tok = tokenGen();
    state.sessions[tok] = u.user_id;
    state.currentToken = tok;
    return { user: { ...u, password: undefined }, session_token: tok };
  },
  async "POST /auth/register"(body, state) {
    await wait();
    if (state.users.find((u) => u.email.toLowerCase() === body.email.toLowerCase()))
      throw fail(409, "Este correo ya está registrado");
    const role = body.email.toLowerCase().endsWith(".tenant@revant.mx") ? "inquilino" : "admin";
    const u = { user_id: "user_" + Math.random().toString(36).slice(2, 12), email: body.email.toLowerCase(), password: body.password, name: body.name, role, picture: null };
    state.users.push(u);
    const tok = tokenGen();
    state.sessions[tok] = u.user_id;
    state.currentToken = tok;
    return { user: { ...u, password: undefined }, session_token: tok };
  },
  async "GET /auth/me"(_, state) {
    const u = currentUser(state);
    if (!u) throw fail(401, "No autenticado");
    return { ...u, password: undefined };
  },
  async "POST /auth/logout"(_, state) {
    state.currentToken = null;
    return { ok: true };
  },
  async "POST /auth/role"(body, state) {
    const u = currentUser(state);
    if (!u) throw fail(401, "No autenticado");
    u.role = body.role;
    return { ...u, password: undefined };
  },
  async "POST /auth/forgot-password"(_body) {
    await wait(400);
    return { ok: true, message: "Si el correo existe, recibirás instrucciones (modo demo)." };
  },
  async "POST /auth/reset-password"() {
    await wait();
    return { ok: true };
  },

  async "GET /properties"(_, state) {
    const u = currentUser(state);
    if (!u) throw fail(401, "No autenticado");
    if (u.role === "inquilino") {
      const myContracts = state.contracts.filter((c) => c.inquilino_email === u.email);
      const ids = myContracts.map((c) => c.property_id);
      return state.properties.filter((p) => ids.includes(p.property_id));
    }
    return state.properties;
  },

  async "GET /contracts"(_, state) {
    const u = currentUser(state);
    if (!u) throw fail(401, "No autenticado");
    if (u.role === "inquilino") return state.contracts.filter((c) => c.inquilino_email === u.email);
    return state.contracts;
  },
  async "GET /contracts/:id"(_, state, id) {
    const u = currentUser(state);
    if (!u) throw fail(401, "No autenticado");
    const c = state.contracts.find((x) => x.contract_id === id);
    if (!c) throw fail(404, "No encontrado");
    if (u.role === "inquilino" && c.inquilino_email !== u.email) throw fail(403, "Sin acceso");
    return c;
  },
  async "POST /contracts/:id/sign"(body, state, id) {
    const u = currentUser(state);
    const c = state.contracts.find((x) => x.contract_id === id);
    if (!c) throw fail(404, "No encontrado");
    c.firmado = true;
    c.firmado_at = new Date().toISOString().slice(0, 10);
    c.signature_image = body?.signature_image || null;
    logAudit(state, u, "contract.sign", "contract", id);
    return c;
  },
  async "PATCH /contracts/:id/status"(body, state, id) {
    const u = currentUser(state);
    if (u?.role !== "admin") throw fail(403, "Solo admin");
    const c = state.contracts.find((x) => x.contract_id === id);
    if (!c) throw fail(404, "No encontrado");
    c.estatus = body.estatus;
    return c;
  },
  async "POST /contracts/:id/remind"(body, state, id) {
    const u = currentUser(state);
    if (u?.role !== "admin") throw fail(403, "Solo admin");
    const c = state.contracts.find((x) => x.contract_id === id);
    if (!c) throw fail(404, "No encontrado");
    let payment_link = null;
    if (body?.include_payment_link && body.origin) {
      const sid = "cs_demo_" + Math.random().toString(36).slice(2);
      payment_link = `${body.origin}/payment-success?session_id=${sid}`;
      state.payments.push({ session_id: sid, contract_id: id, amount: c.monto_renta, currency: "mxn", payment_status: "initiated", created_at: new Date().toISOString() });
    }
    logAudit(state, u, "reminder.send_manual", "contract", id, { to: c.inquilino_email, payment_link: !!payment_link });
    return { contract_id: id, to: c.inquilino_email, sent: false, simulated: true, payment_link, demo: true };
  },
  async "POST /contracts/bulk"(body, state) {
    const u = currentUser(state);
    if (u?.role !== "admin") throw fail(403, "Solo admin");
    const ids = body.contract_ids || [];
    const items = [];
    for (const id of ids) {
      const c = state.contracts.find((x) => x.contract_id === id);
      if (!c) continue;
      if (body.action === "set_status") {
        c.estatus = body.estatus;
        items.push({ contract_id: id, ok: true, estatus: body.estatus });
      } else if (body.action === "send_reminder") {
        let payment_link = null;
        if (body.include_payment_link && body.origin) {
          const sid = "cs_demo_" + Math.random().toString(36).slice(2);
          payment_link = `${body.origin}/payment-success?session_id=${sid}`;
          state.payments.push({ session_id: sid, contract_id: id, amount: c.monto_renta, currency: "mxn", payment_status: "initiated", created_at: new Date().toISOString() });
        }
        items.push({ contract_id: id, to: c.inquilino_email, simulated: true, payment_link });
      } else if (body.action === "create_checkout") {
        const sid = "cs_demo_" + Math.random().toString(36).slice(2);
        const url = `${body.origin}/payment-success?session_id=${sid}`;
        state.payments.push({ session_id: sid, contract_id: id, amount: c.monto_renta * (body.months || 1), currency: "mxn", payment_status: "initiated", months: body.months, created_at: new Date().toISOString() });
        items.push({ contract_id: id, url, session_id: sid, amount: c.monto_renta * (body.months || 1) });
      }
    }
    logAudit(state, u, body.action === "set_status" ? "bulk.set_status" : (body.action === "send_reminder" ? "reminder.bulk" : "payment.bulk_checkout"), "", "", { count: items.length });
    return { processed: items.length, missing: [], items };
  },

  async "POST /payments/checkout"(body, state) {
    const u = currentUser(state);
    if (u?.role !== "admin") throw fail(403, "Solo admin");
    const c = state.contracts.find((x) => x.contract_id === body.contract_id);
    if (!c) throw fail(404, "No encontrado");
    const months = body.months || 1;
    const amount = c.monto_renta * months;
    const sid = "cs_demo_" + Math.random().toString(36).slice(2);
    const origin = (body.origin || "").replace(/\/$/, "");
    const url = `${origin}/payment-success?session_id=${sid}`;
    state.payments.push({ session_id: sid, contract_id: body.contract_id, amount, currency: "mxn", payment_status: "initiated", months, created_at: new Date().toISOString() });
    logAudit(state, u, "payment.checkout_create", "contract", body.contract_id, { session_id: sid, amount });
    return { url, session_id: sid, amount };
  },
  async "GET /payments/status/:sid"(_, state, sid) {
    const tx = state.payments.find((p) => p.session_id === sid);
    if (!tx) throw fail(404, "Sesión no encontrada");
    // Auto-mark as paid in demo after first poll
    if (tx.payment_status !== "paid") {
      tx.payment_status = "paid";
      tx.status = "complete";
      const c = state.contracts.find((x) => x.contract_id === tx.contract_id);
      if (c) c.estatus = "pagado";
    }
    return { payment_status: tx.payment_status, status: "complete", amount_total: Math.round(tx.amount * 100), currency: tx.currency, metadata: { contract_id: tx.contract_id } };
  },

  async "GET /dashboard/kpis"(_, state) {
    const u = currentUser(state);
    if (!u) throw fail(401, "No autenticado");
    const cs = u.role === "admin" ? state.contracts : state.contracts.filter((c) => c.inquilino_email === u.email);
    const props = state.properties;
    const cobradas = cs.filter((c) => c.estatus === "pagado").reduce((s, c) => s + c.monto_renta, 0);
    const ingresos = cs.reduce((s, c) => s + c.monto_renta, 0);
    const ocupadas = props.filter((p) => p.ocupada).length;
    const por_vencer = cs.filter((c) => { const d = daysUntilISO(c.fecha_vencimiento); return d >= 0 && d <= 30; }).length;
    const atrasados = cs.filter((c) => c.estatus === "atrasado").length;
    return {
      ingresos_mensuales: ingresos, rentas_cobradas: cobradas,
      ocupacion_pct: props.length ? Math.round((ocupadas / props.length) * 100) : 0,
      ocupadas, total_propiedades: props.length,
      contratos_por_vencer: por_vencer,
      tasa_morosidad_pct: cs.length ? Math.round((atrasados / cs.length) * 1000) / 10 : 0,
      total_contratos: cs.length,
    };
  },
  async "GET /dashboard/series"(_, state) {
    const u = currentUser(state);
    if (!u) throw fail(401, "No autenticado");
    const cs = u.role === "admin" ? state.contracts : state.contracts.filter((c) => c.inquilino_email === u.email);
    const monthlyTotal = cs.filter((c) => c.estatus === "pagado").reduce((s, c) => s + c.monto_renta, 0);
    const months = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const m = new Date(now); m.setMonth(now.getMonth() - i);
      const factor = 0.65 + ((11 - i) % 5) * 0.07;
      months.push({ month: m.toLocaleDateString("es-MX", { month: "short", year: "numeric" }), ingresos: Math.round(monthlyTotal * factor) });
    }
    const status_count = { pagado: 0, pendiente: 0, atrasado: 0 };
    cs.forEach((c) => { status_count[c.estatus]++; });
    return {
      cashflow: months,
      status: Object.entries(status_count).map(([k, v]) => ({ name: k.charAt(0).toUpperCase() + k.slice(1), value: v })),
      by_property: state.properties.slice(0, 8).map((p) => {
        const c = cs.find((x) => x.property_id === p.property_id);
        return { propiedad: p.nombre.slice(0, 18), monto: c ? c.monto_renta : 0, ocupada: p.ocupada };
      }),
    };
  },

  async "POST /arco"(body, state) {
    await wait(400);
    const r = {
      request_id: "arco_" + Math.random().toString(36).slice(2, 12),
      ...body, estatus: "pendiente", notas_resolucion: null,
      created_at: new Date().toISOString(), resolved_at: null,
    };
    state.arco.unshift(r);
    return r;
  },
  async "GET /arco"(_, state) {
    const u = currentUser(state);
    if (u?.role !== "admin") throw fail(403, "Solo admin");
    return state.arco;
  },
  async "PATCH /arco/:id"(body, state, id) {
    const u = currentUser(state);
    if (u?.role !== "admin") throw fail(403, "Solo admin");
    const r = state.arco.find((x) => x.request_id === id);
    if (!r) throw fail(404, "No encontrado");
    Object.assign(r, body);
    if (["resuelto", "rechazado"].includes(body.estatus)) r.resolved_at = new Date().toISOString();
    logAudit(state, u, "arco.update", "arco", id, { estatus: body.estatus });
    return r;
  },

  async "GET /audit"(_, state) {
    const u = currentUser(state);
    if (u?.role !== "admin") throw fail(403, "Solo admin");
    return state.audit.slice(0, 200);
  },
};

function matchHandler(method, path) {
  // exact
  const exact = `${method} ${path}`;
  if (handlers[exact]) return { fn: handlers[exact], params: {} };
  // pattern
  for (const key of Object.keys(handlers)) {
    const [m, p] = key.split(" ");
    if (m !== method) continue;
    const parts = p.split("/");
    const inParts = path.split("/");
    if (parts.length !== inParts.length) continue;
    const params = {};
    let ok = true;
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].startsWith(":")) params[parts[i].slice(1)] = inParts[i];
      else if (parts[i] !== inParts[i]) { ok = false; break; }
    }
    if (ok) return { fn: handlers[key], params };
  }
  return null;
}

async function call(method, path, body) {
  const state = load();
  // strip query string for matching (status?limit=200 -> status)
  const cleanPath = path.split("?")[0];
  const m = matchHandler(method, cleanPath);
  if (!m) throw fail(404, `Mock endpoint not implemented: ${method} ${path}`);
  const data = await m.fn(body, state, ...Object.values(m.params));
  save(state);
  return { data };
}

export const api = {
  get: (path, opts) => call("GET", path, opts?.params),
  post: (path, body) => call("POST", path, body || {}),
  patch: (path, body) => call("PATCH", path, body || {}),
  delete: (path) => call("DELETE", path),
};

export const API = "/mock";

export const fmtMXN = (n) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n || 0);
export const fmtDate = (iso) => {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }); } catch { return iso; }
};
export const daysUntil = (iso) => {
  if (!iso) return null;
  return Math.ceil((new Date(iso) - new Date()) / 86400000);
};
