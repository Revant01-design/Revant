import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { api } from "../lib/api";
import { toast } from "sonner";
import Logo from "../components/Logo";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email, origin: window.location.origin });
      setSent(true);
    } catch {
      toast.error("Error al enviar la solicitud");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b border-slate-100">
        <div className="max-w-3xl mx-auto px-6 py-5">
          <Logo variant="light" size="sm" />
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md space-y-6" data-testid="forgot-page">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[#0A1A2F]" data-testid="back-login">
            <ArrowLeft className="w-3.5 h-3.5" /> Volver al login
          </Link>

          <div>
            <p className="uppercase tracking-[0.18em] text-xs text-[#C9B37E] font-semibold mb-3">Restablecer contraseña</p>
            <h2 className="font-display text-3xl font-bold tracking-tight text-[#0A1A2F]">¿Olvidaste tu contraseña?</h2>
            <p className="mt-3 text-slate-500">Te enviaremos un token a tu correo para crear una nueva.</p>
          </div>

          {sent ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-md p-6" data-testid="forgot-success">
              <p className="font-semibold text-emerald-800">Si tu correo está registrado, recibirás instrucciones.</p>
              <p className="text-sm text-emerald-700 mt-2">Revisa tu bandeja (y la carpeta de spam). El enlace caduca en 1 hora.</p>
              <Link to="/reset-password" className="block mt-4 text-sm font-semibold text-[#0A1A2F] underline decoration-[#C9B37E] underline-offset-4" data-testid="go-reset">
                Tengo el token → Restablecer ahora
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.18em] text-slate-500 font-semibold mb-2">Correo</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 pl-10" data-testid="forgot-email" />
                </div>
              </div>
              <Button type="submit" disabled={loading} data-testid="forgot-submit"
                      className="w-full h-12 bg-[#0A1A2F] text-white hover:bg-[#0A1A2F]/90 transition-all duration-200">
                {loading ? "Enviando…" : "Enviar instrucciones"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
