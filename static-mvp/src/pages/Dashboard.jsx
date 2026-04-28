import { useEffect, useState } from "react";
import { TrendingUp, Building2, CalendarClock, AlertTriangle, ArrowUpRight, Send } from "lucide-react";
import { api, fmtMXN, fmtDate, daysUntil } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import KpiCard from "../components/KpiCard";
import StatusBadge from "../components/StatusBadge";
import DashboardCharts from "../components/DashboardCharts";
import { Button } from "../components/ui/button";
import { toast } from "sonner";

export default function Dashboard() {
  const { user } = useAuth();
  const [kpis, setKpis] = useState(null);
  const [contracts, setContracts] = useState([]);

  useEffect(() => {
    (async () => {
      const [k, c] = await Promise.all([api.get("/dashboard/kpis"), api.get("/contracts")]);
      setKpis(k.data); setContracts(c.data);
    })();
  }, []);

  const greeting = `Bienvenido, ${user?.name?.split(" ")[0] || "Usuario"}`;
  const upcoming = [...contracts]
    .filter(c => daysUntil(c.fecha_vencimiento) >= 0 && daysUntil(c.fecha_vencimiento) <= 60)
    .sort((a, b) => daysUntil(a.fecha_vencimiento) - daysUntil(b.fecha_vencimiento))
    .slice(0, 5);

  const runAutoReminders = async () => {
    try {
      const { data } = await api.post("/notifications/run-auto-reminders");
      const realCount = data.items.filter(i => !i.simulated).length;
      const simCount = data.items.filter(i => i.simulated).length;
      if (realCount > 0) toast.success(`${realCount} recordatorio(s) enviados`);
      if (simCount > 0) toast.info(`${simCount} simulados (sin credenciales Gmail)`);
      if (data.processed === 0) toast.info("Sin vencimientos en los próximos 7 días");
    } catch { toast.error("Error al ejecutar recordatorios"); }
  };

  return (
    <div className="space-y-8" data-testid="dashboard-page">
      {/* Greeting */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#D3A154] font-semibold mb-2">
            {new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <h2 className="font-display text-3xl lg:text-4xl font-bold tracking-tight text-[#031433]" data-testid="greeting">
            {greeting}.
          </h2>
          <p className="mt-2 text-slate-500">
            {user?.role === "admin"
              ? "Aquí está el panorama financiero de tu portafolio hoy."
              : "Aquí está el resumen de tu contrato y pagos."}
          </p>
        </div>
        {kpis && (
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-md">
              <ArrowUpRight className="w-4 h-4 text-emerald-700" />
              <span className="text-sm font-semibold text-emerald-700">{fmtMXN(kpis.rentas_cobradas)} cobrados</span>
            </div>
            {user?.role === "admin" && (
              <Button
                data-testid="run-auto-reminders"
                onClick={runAutoReminders}
                className="h-10 bg-[#D3A154] text-[#031433] hover:bg-[#D3A154]/90 transition-all duration-200"
              >
                <Send className="w-4 h-4 mr-2" /> Ejecutar recordatorios
              </Button>
            )}
          </div>
        )}
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
        <KpiCard
          testid="kpi-ingresos"
          label="Ingresos mensuales"
          value={kpis ? fmtMXN(kpis.ingresos_mensuales) : "—"}
          sub={kpis ? `${kpis.total_contratos} contratos activos` : ""}
          icon={TrendingUp}
          accent
        />
        <KpiCard
          testid="kpi-ocupacion"
          label="Ocupación"
          value={kpis ? `${kpis.ocupacion_pct}%` : "—"}
          sub={kpis ? `${kpis.ocupadas}/${kpis.total_propiedades} propiedades` : ""}
          icon={Building2}
        />
        <KpiCard
          testid="kpi-por-vencer"
          label="Contratos por vencer"
          value={kpis ? kpis.contratos_por_vencer : "—"}
          sub="En los próximos 30 días"
          icon={CalendarClock}
        />
        <KpiCard
          testid="kpi-morosidad"
          label="Tasa de morosidad"
          value={kpis ? `${kpis.tasa_morosidad_pct}%` : "—"}
          sub="Pagos atrasados"
          icon={AlertTriangle}
        />
      </div>

      {/* Charts */}
      {user?.role === "admin" && <DashboardCharts />}

      {/* Upcoming */}
      <div className="bg-white border border-slate-200 rounded-md">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-semibold">Próximos vencimientos</p>
            <h3 className="font-display text-xl font-bold tracking-tight text-[#031433] mt-1">Acciones requeridas</h3>
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {upcoming.length === 0 && (
            <p className="px-6 py-10 text-sm text-slate-500 text-center">Sin vencimientos próximos.</p>
          )}
          {upcoming.map((c) => {
            const days = daysUntil(c.fecha_vencimiento);
            return (
              <div key={c.contract_id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors" data-testid={`upcoming-${c.contract_id}`}>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#031433] truncate">{c.inquilino_nombre}</p>
                  <p className="text-sm text-slate-500 truncate">{c.propiedad_nombre} · {fmtMXN(c.monto_renta)}/mes</p>
                </div>
                <div className="flex items-center gap-4 ml-4">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-medium text-[#031433]">{fmtDate(c.fecha_vencimiento)}</p>
                    <p className={`text-xs ${days <= 7 ? "text-red-600" : days <= 30 ? "text-amber-700" : "text-slate-500"}`}>
                      {days === 0 ? "Vence hoy" : `${days} días`}
                    </p>
                  </div>
                  <StatusBadge status={c.estatus} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
