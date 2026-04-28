import { useEffect, useState } from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from "recharts";
import { api, fmtMXN } from "../lib/api";

const COLORS = { pagado: "#10B981", pendiente: "#D3A154", atrasado: "#DC2626" };

export default function DashboardCharts() {
  const [data, setData] = useState(null);
  useEffect(() => {
    (async () => {
      const { data } = await api.get("/dashboard/series");
      setData(data);
    })();
  }, []);

  if (!data) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6" data-testid="dashboard-charts">
      <ChartCard title="Ingresos cobrados" subtitle="Últimos 12 meses" className="lg:col-span-2">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data.cashflow} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false}
                   tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }}
                     formatter={(v) => fmtMXN(v)} />
            <Line type="monotone" dataKey="ingresos" stroke="#031433" strokeWidth={2.5}
                  dot={{ fill: "#D3A154", r: 4 }} activeDot={{ r: 6, fill: "#D3A154" }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Distribución" subtitle="Estatus de pago">
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={data.status} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={85}
                 paddingAngle={3} stroke="#fff" strokeWidth={2}>
              {data.status.map((s, i) => (
                <Cell key={i} fill={COLORS[s.name.toLowerCase()] || "#94a3b8"} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }} />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Renta por propiedad" subtitle="Top portafolio" className="lg:col-span-3">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data.by_property} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="propiedad" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} angle={-15} textAnchor="end" height={60} />
            <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false}
                   tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }}
                     formatter={(v) => fmtMXN(v)} />
            <Bar dataKey="monto" radius={[4, 4, 0, 0]}>
              {data.by_property.map((p, i) => (
                <Cell key={i} fill={p.ocupada ? "#031433" : "#cbd5e1"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

function ChartCard({ title, subtitle, children, className = "" }) {
  return (
    <div className={`bg-white border border-slate-200 rounded-md p-5 ${className}`}>
      <div className="mb-4">
        <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500 font-semibold">{subtitle}</p>
        <h3 className="font-display text-lg font-bold tracking-tight text-[#031433] mt-0.5">{title}</h3>
      </div>
      {children}
    </div>
  );
}
