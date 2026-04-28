import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Building2, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { api } from "../lib/api";

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const [status, setStatus] = useState("checking"); // checking | paid | failed
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!sessionId) { setStatus("failed"); return; }
    let attempts = 0;
    const poll = async () => {
      attempts++;
      try {
        const { data } = await api.get(`/payments/status/${sessionId}`);
        setData(data);
        if (data.payment_status === "paid") { setStatus("paid"); return; }
        if (data.status === "expired" || attempts >= 8) { setStatus("failed"); return; }
        setTimeout(poll, 2000);
      } catch {
        if (attempts >= 8) setStatus("failed");
        else setTimeout(poll, 2000);
      }
    };
    poll();
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-100">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-md flex items-center justify-center" style={{ background: "#031433" }}>
            <Building2 className="w-5 h-5" style={{ color: "#D3A154" }} />
          </div>
          <span className="font-display text-xl font-bold tracking-tight text-[#031433]">REVANT</span>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-6 py-20 text-center" data-testid="payment-success-page">
        {status === "checking" && (
          <>
            <Loader2 className="w-12 h-12 text-[#031433] animate-spin mx-auto" />
            <h2 className="font-display text-3xl font-bold tracking-tight text-[#031433] mt-6">Verificando pago…</h2>
            <p className="text-slate-500 mt-3">Por favor no cierres esta ventana.</p>
          </>
        )}
        {status === "paid" && (
          <>
            <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto" data-testid="payment-paid">
              <CheckCircle2 className="w-9 h-9 text-emerald-600" />
            </div>
            <h2 className="font-display text-3xl font-bold tracking-tight text-[#031433] mt-6">¡Pago recibido!</h2>
            <p className="text-slate-500 mt-3">
              Confirmamos tu pago de <strong>${(data?.amount_total / 100).toLocaleString("es-MX")} {data?.currency?.toUpperCase()}</strong>.
              Tu contrato ha sido marcado como <strong>Pagado</strong>.
            </p>
            <p className="text-xs text-slate-400 mt-2 font-mono">{sessionId}</p>
            <Link to="/dashboard" className="inline-block mt-8 px-6 h-12 leading-[48px] bg-[#031433] text-white rounded-md font-semibold hover:bg-[#031433]/90" data-testid="back-dashboard">
              Volver al dashboard
            </Link>
          </>
        )}
        {status === "failed" && (
          <>
            <div className="w-16 h-16 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mx-auto" data-testid="payment-failed">
              <XCircle className="w-9 h-9 text-red-600" />
            </div>
            <h2 className="font-display text-3xl font-bold tracking-tight text-[#031433] mt-6">No pudimos verificar el pago</h2>
            <p className="text-slate-500 mt-3">Si crees que se cobró, contacta a soporte. Sesión: <span className="font-mono text-xs">{sessionId}</span></p>
            <Link to="/dashboard" className="inline-block mt-8 px-6 h-12 leading-[48px] border border-slate-300 text-[#031433] rounded-md font-semibold hover:bg-slate-50">
              Volver al dashboard
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
