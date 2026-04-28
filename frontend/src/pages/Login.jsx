import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Building2, ShieldCheck, TrendingUp, FileSignature, Mail, Lock, User as UserIcon } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
export default function Login() {
  const navigate = useNavigate();
  const { loginPassword, registerPassword } = useAuth();
  const [tab, setTab] = useState("login");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", name: "" });

  const handleGoogle = () => {
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
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

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white">
      <div className="relative hidden lg:flex flex-col justify-between p-12 text-white" style={{ background: "#031433" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md flex items-center justify-center" style={{ background: "#D3A154" }}>
            <Building2 className="w-5 h-5 text-[#031433]" />
          </div>
          <span className="font-display text-2xl font-bold tracking-tight">REVANT</span>
        </div>

        <div className="space-y-8">
          <div>
            <p className="uppercase tracking-[0.2em] text-xs text-[#D3A154] mb-4">PropTech · FinTech</p>
            <h1 className="font-display text-5xl xl:text-6xl font-bold leading-[1.05]">
              Operación inmobiliaria<br />
              <span style={{ color: "#D3A154" }}>institucional.</span>
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
                <f.icon className="w-4 h-4" style={{ color: "#D3A154" }} />
                <span className="text-sm text-white/85">{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-white/40">© {new Date().getFullYear()} Revant · LFPDPPP compliant</p>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-10">
        <div className="w-full max-w-md space-y-6">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-md flex items-center justify-center" style={{ background: "#031433" }}>
              <Building2 className="w-5 h-5" style={{ color: "#D3A154" }} />
            </div>
            <span className="font-display text-2xl font-bold tracking-tight text-[#031433]">REVANT</span>
          </div>

          <div>
            <p className="uppercase tracking-[0.18em] text-xs text-[#D3A154] font-semibold mb-3">Acceso seguro</p>
            <h2 className="font-display text-3xl lg:text-4xl font-bold tracking-tight text-[#031433]">
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
                  <Link to="/forgot-password" className="text-xs text-slate-500 hover:text-[#031433] font-medium underline decoration-[#D3A154] underline-offset-4" data-testid="forgot-link">
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <Button type="submit" disabled={loading} data-testid="login-submit"
                        className="w-full h-12 bg-[#031433] text-white hover:bg-[#031433]/90 transition-all duration-200">
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
                        className="w-full h-12 bg-[#031433] text-white hover:bg-[#031433]/90 transition-all duration-200">
                  {loading ? "Creando…" : "Crear cuenta"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="flex items-center gap-3 my-2">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-[10px] uppercase tracking-wider text-slate-400">o continúa con</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <Button
            data-testid="google-login-btn"
            onClick={handleGoogle}
            type="button"
            className="w-full h-12 bg-white border border-slate-200 text-[#031433] hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 font-medium gap-3 shadow-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuar con Google
          </Button>

          <p className="text-xs text-slate-400 text-center leading-relaxed">
            Al continuar aceptas los{" "}
            <span className="text-[#031433] font-medium underline decoration-[#D3A154] underline-offset-4">Términos</span>{" "}
            y la{" "}
            <span className="text-[#031433] font-medium underline decoration-[#D3A154] underline-offset-4">Política de Privacidad</span>{" "}
            (LFPDPPP). Para ejercer derechos ARCO,{" "}
            <Link to="/arco-publico" className="text-[#D3A154] font-semibold underline" data-testid="link-arco">haz clic aquí</Link>.
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
