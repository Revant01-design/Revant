import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Building2, Lock, KeyRound } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { api } from "../lib/api";
import { toast } from "sonner";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState(params.get("token") || "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (params.get("token")) setToken(params.get("token")); }, [params]);

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 6) { toast.error("La contraseña debe tener al menos 6 caracteres"); return; }
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      toast.success("Contraseña actualizada. Ya puedes ingresar.");
      navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Token inválido o expirado");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b border-slate-100">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-md flex items-center justify-center" style={{ background: "#031433" }}>
            <Building2 className="w-5 h-5" style={{ color: "#D3A154" }} />
          </div>
          <span className="font-display text-xl font-bold tracking-tight text-[#031433]">REVANT</span>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md space-y-6" data-testid="reset-page">
          <div>
            <p className="uppercase tracking-[0.18em] text-xs text-[#D3A154] font-semibold mb-3">Nueva contraseña</p>
            <h2 className="font-display text-3xl font-bold tracking-tight text-[#031433]">Restablece tu acceso</h2>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-[11px] uppercase tracking-[0.18em] text-slate-500 font-semibold mb-2">Token</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input required value={token} onChange={(e) => setToken(e.target.value)} className="h-11 pl-10 font-mono text-xs" data-testid="reset-token" />
              </div>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-[0.18em] text-slate-500 font-semibold mb-2">Nueva contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 pl-10" data-testid="reset-password" />
              </div>
            </div>
            <Button type="submit" disabled={loading} data-testid="reset-submit"
                    className="w-full h-12 bg-[#031433] text-white hover:bg-[#031433]/90 transition-all duration-200">
              {loading ? "Guardando…" : "Cambiar contraseña"}
            </Button>
          </form>

          <Link to="/" className="block text-center text-sm text-slate-500 hover:text-[#031433]">Volver al login</Link>
        </div>
      </div>
    </div>
  );
}
