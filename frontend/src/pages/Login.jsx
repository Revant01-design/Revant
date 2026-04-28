import { Building2, ShieldCheck, TrendingUp, FileSignature } from "lucide-react";
import { Button } from "../components/ui/button";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
export default function Login() {
  const handleLogin = () => {
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white">
      {/* Left – brand panel */}
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

        <p className="text-xs text-white/40">© {new Date().getFullYear()} Revant. Todos los derechos reservados.</p>
      </div>

      {/* Right – sign-in */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-md flex items-center justify-center" style={{ background: "#031433" }}>
              <Building2 className="w-5 h-5" style={{ color: "#D3A154" }} />
            </div>
            <span className="font-display text-2xl font-bold tracking-tight text-[#031433]">REVANT</span>
          </div>

          <div>
            <p className="uppercase tracking-[0.18em] text-xs text-[#D3A154] font-semibold mb-3">Acceso seguro</p>
            <h2 className="font-display text-4xl font-bold tracking-tight text-[#031433]">Bienvenido de vuelta</h2>
            <p className="mt-3 text-slate-500">Ingresa con tu cuenta de Google para acceder al dashboard.</p>
          </div>

          <Button
            data-testid="google-login-btn"
            onClick={handleLogin}
            className="w-full h-14 bg-white border border-slate-200 text-[#031433] hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 text-base font-medium gap-3 shadow-sm hover:shadow"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuar con Google
          </Button>

          <div className="text-xs text-slate-400 text-center leading-relaxed">
            Al continuar aceptas nuestros{" "}
            <span className="text-[#031433] font-medium underline decoration-[#D3A154] underline-offset-4">Términos</span>{" "}
            y la{" "}
            <span className="text-[#031433] font-medium underline decoration-[#D3A154] underline-offset-4">Política de Privacidad</span>{" "}
            conforme a la LFPDPPP.
          </div>

          <div className="border-t border-slate-100 pt-6">
            <p className="text-xs uppercase tracking-wider text-slate-400 mb-3">Cuentas demo</p>
            <p className="text-sm text-slate-500">
              Inicia con cualquier correo Google → automáticamente serás <span className="font-semibold text-[#031433]">Administrador</span>.
              Para probar la vista <span className="font-semibold text-[#031433]">Inquilino</span>, usa el switch del perfil dentro del dashboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
