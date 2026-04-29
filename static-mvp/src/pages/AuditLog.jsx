import { useEffect, useState } from "react";
import { api } from "../lib/api";

const ACTION_LABEL = {
  "contract.sign": "Firma de contrato",
  "contract.download_pdf": "Descarga de PDF",
  "reminder.send_manual": "Recordatorio manual",
  "reminder.run_auto": "Recordatorios automáticos",
  "arco.update": "Actualización ARCO",
};

export default function AuditLog() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    (async () => {
      const { data } = await api.get("/audit?limit=200");
      setItems(data);
    })();
  }, []);

  return (
    <div className="space-y-6" data-testid="audit-page">
      <div className="bg-white border border-slate-200 rounded-md">
        <div className="px-6 py-4 border-b border-slate-100">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-semibold">Registro de auditoría</p>
          <p className="text-sm text-slate-500 mt-1">Trazabilidad de acciones críticas conforme a buenas prácticas LFPDPPP.</p>
        </div>
        <div className="divide-y divide-slate-100">
          {items.length === 0 && <p className="px-6 py-12 text-center text-slate-500">Sin actividad registrada.</p>}
          {items.map((l) => (
            <div key={l.log_id} className="px-6 py-4 flex items-start gap-4 hover:bg-slate-50 transition-colors" data-testid={`audit-${l.log_id}`}>
              <div className="w-2 h-2 rounded-full mt-2" style={{ background: "#C9B37E" }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#0A1A2F]">
                  {ACTION_LABEL[l.action] || l.action}
                  {l.target_id && <span className="text-slate-400 font-mono text-xs ml-2">{l.target_id}</span>}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{l.user_email || "Sistema"} · {new Date(l.created_at).toLocaleString("es-MX")}</p>
                {Object.keys(l.details || {}).length > 0 && (
                  <pre className="mt-2 text-[11px] bg-slate-50 border border-slate-200 rounded p-2 overflow-x-auto text-slate-600">
                    {JSON.stringify(l.details, null, 2)}
                  </pre>
                )}
              </div>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                {l.user_role}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
