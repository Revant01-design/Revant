import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ShieldCheck, TrendingUp, FileSignature, Mail, Lock, User as UserIcon, Building2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import Logo from "../components/Logo";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
export default function Login() {
  const navigate = useNavigate();
  const { loginPassword, registerPassword } = useAuth();
  const [tab, setTab] = useState("login");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", name: "" });

  const handleGoogle = () => {
    // Static MVP — Google OAuth not available in mock mode
    toast.error("Google OAuth no disponible en versión demo. Usa una cuenta demo abajo.");
  };

  const formatErr = (d) => {
    if (!d) return "Algo salió mal. Intenta de nuevo.";
    if (typeof d === "string") return d;
    if (Array.isArray(d)) return d.map(e => e?.msg || JSON.stringify(e)).join(" ");
    return d.msg || JSON.stringify(d);
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (tab === "login") {
        await loginPassword(form.email, form.password);
      } else {
        await registerPassword(form.email, form.password, form.name);
      }
      toast.success(tab === "login" ? "Bienvenido de vuelta" : "Cuenta creada");
      navigate("/dashboard");
    } catch (err) {
      toast.error(formatErr(err.response?.data?.detail) || err.message);
    } finally { setLoading(false); }
  };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const fillDemo = (kind) => {
    if (kind === "admin") setForm({ email: "admin@revant.mx", password: "Revant2026!", name: "" });
    else setForm({ email: "jorge.tenant@revant.mx", password: "Inquilino2026!", name: "" });
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white">
      <div className="relative hidden lg:flex flex-col justify-between p-12 text-white" style={{ background: "#0A1A2F" }}>
        <Logo variant="dark" size="md" />

        <div className="space-y-8">
          <div>
            <p className="uppercase tracking-[0.2em] text-xs text-[#C9B37E] mb-4">PropTech · FinTech</p>
            <h1 className="font-display text-5xl xl:text-6xl font-bold leading-[1.05]">
              Operación inmobiliaria<br />
              <span style={{ color: "#C9B37E" }}>institucional.</span>
            </h1>
            <p className="mt-6 text-white/70 text-lg max-w-md">
              Una sola plataforma para administrar rentas, contratos y métricas financieras de tu portafolio.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-lg">
            {[
              { icon: TrendingUp, label: "Rent Roll en tiempo real" },
              { icon: FileSignature, label: "Contratos digitales" },
              { icon: ShieldCheck, label: "Cumplimiento mexicano" },
              { icon: Building2, label: "Multi-propiedad" },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3 p-3 border border-white/10 rounded-md">
                <f.icon className="w-4 h-4" style={{ color: "#C9B37E" }} />
                <span className="text-sm text-white/85">{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-white/40">© {new Date().getFullYear()} Revant · LFPDPPP compliant</p>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-10">
        <div className="w-full max-w-md space-y-6">
          <div className="lg:hidden mb-8">
            <Logo variant="light" size="md" />
          </div>

          <div>
            <p className="uppercase tracking-[0.18em] text-xs text-[#C9B37E] font-semibold mb-3">Acceso seguro</p>
            <h2 className="font-display text-3xl lg:text-4xl font-bold tracking-tight text-[#0A1A2F]">
              {tab === "login" ? "Bienvenido de vuelta" : "Crea tu cuenta"}
            </h2>
          </div>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid w-full grid-cols-2" data-testid="auth-tabs">
              <TabsTrigger value="login" data-testid="tab-login">Ingresar</TabsTrigger>
              <TabsTrigger value="register" data-testid="tab-register">Registrarse</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-6">
              <form onSubmit={submit} className="space-y-4">
                <FieldGroup icon={Mail} label="Correo">
                  <Input type="email" required value={form.email} onChange={set("email")} className="h-11 pl-10" placeholder="tu@email.com" data-testid="login-email" />
                </FieldGroup>
                <FieldGroup icon={Lock} label="Contraseña">
                  <Input type="password" required value={form.password} onChange={set("password")} className="h-11 pl-10" placeholder="••••••••" data-testid="login-password" />
                </FieldGroup>
                <div className="flex justify-end">
                  <Link to="/forgot-password" className="text-xs text-slate-500 hover:text-[#0A1A2F] font-medium underline decoration-[#C9B37E] underline-offset-4" data-testid="forgot-link">
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <Button type="submit" disabled={loading} data-testid="login-submit"
                        className="w-full h-12 bg-[#0A1A2F] text-white hover:bg-[#0A1A2F]/90 transition-all duration-200">
                  {loading ? "Ingresando…" : "Ingresar"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register" className="mt-6">
              <form onSubmit={submit} className="space-y-4">
                <FieldGroup icon={UserIcon} label="Nombre completo">
                  <Input required value={form.name} onChange={set("name")} className="h-11 pl-10" placeholder="Jorge Hernández" data-testid="register-name" />
                </FieldGroup>
                <FieldGroup icon={Mail} label="Correo">
                  <Input type="email" required value={form.email} onChange={set("email")} className="h-11 pl-10" placeholder="tu@email.com" data-testid="register-email" />
                </FieldGroup>
                <FieldGroup icon={Lock} label="Contraseña (min 6)">
                  <Input type="password" required minLength={6} value={form.password} onChange={set("password")} className="h-11 pl-10" placeholder="••••••••" data-testid="register-password" />
                </FieldGroup>
                <Button type="submit" disabled={loading} data-testid="register-submit"
                        className="w-full h-12 bg-[#0A1A2F] text-white hover:bg-[#0A1A2F]/90 transition-all duration-200">
                  {loading ? "Creando…" : "Crear cuenta"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {/* Demo accounts quick access (static MVP only) */}
          <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-amber-700 font-semibold mb-2">Modo demo · Datos locales</p>
            <p className="text-xs text-slate-600 mb-3">Cuentas precargadas para probar:</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => fillDemo("admin")} type="button" className="text-left p-2 rounded bg-white border border-amber-200 hover:border-[#C9B37E] transition-colors" data-testid="demo-admin">
                <p className="text-xs font-bold text-[#0A1A2F]">Admin</p>
                <p className="text-[10px] text-slate-500">admin@revant.mx</p>
              </button>
              <button onClick={() => fillDemo("tenant")} type="button" className="text-left p-2 rounded bg-white border border-amber-200 hover:border-[#C9B37E] transition-colors" data-testid="demo-tenant">
                <p className="text-xs font-bold text-[#0A1A2F]">Inquilino</p>
                <p className="text-[10px] text-slate-500">jorge.tenant@revant.mx</p>
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-400 text-center leading-relaxed">
            Para ejercer derechos ARCO,{" "}
            <Link to="/arco-publico" className="text-[#C9B37E] font-semibold underline" data-testid="link-arco">haz clic aquí</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}

function FieldGroup({ icon: Icon, label, children }) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-[0.18em] text-slate-500 font-semibold mb-2">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        {children}
      </div>
    </div>
  );
}
