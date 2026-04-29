import { useEffect, useState } from "react";
import { FileText, ShieldCheck, AlertCircle } from "lucide-react";
import { api, fmtMXN, fmtDate } from "../lib/api";
import StatusBadge from "../components/StatusBadge";
import ContractViewer from "../components/ContractViewer";
import { Button } from "../components/ui/button";

export default function Contracts() {
  const [contracts, setContracts] = useState([]);
  const [selected, setSelected] = useState(null);

  const load = async () => {
    const { data } = await api.get("/contracts");
    setContracts(data);
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6" data-testid="contracts-page">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        {contracts.map((c) => (
          <div key={c.contract_id} className="bg-white border border-slate-200 rounded-md p-6 lift-hover" data-testid={`contract-card-${c.contract_id}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-md bg-slate-50 flex items-center justify-center">
                <FileText className="w-5 h-5 text-[#0A1A2F]" />
              </div>
              <StatusBadge status={c.estatus} />
            </div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500 font-semibold">{c.contract_id}</p>
            <h3 className="mt-1 font-display text-lg font-bold tracking-tight text-[#0A1A2F] truncate">{c.inquilino_nombre}</h3>
            <p className="text-sm text-slate-500 truncate">{c.propiedad_nombre}</p>

            <div className="grid grid-cols-2 gap-3 mt-5 pt-5 border-t border-slate-100">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Renta</p>
                <p className="font-semibold text-[#0A1A2F]">{fmtMXN(c.monto_renta)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Vence</p>
                <p className="font-semibold text-[#0A1A2F]">{fmtDate(c.fecha_vencimiento)}</p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between">
              {c.firmado ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" /> Firmado
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs text-amber-700 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" /> Pendiente firma
                </span>
              )}
              <Button
                data-testid={`open-${c.contract_id}`}
                onClick={() => setSelected(c)}
                size="sm"
                className="bg-[#0A1A2F] text-white hover:bg-[#0A1A2F]/90 transition-all duration-200"
              >
                Abrir
              </Button>
            </div>
          </div>
        ))}
      </div>
      {contracts.length === 0 && (
        <p className="text-center py-12 text-slate-500">Sin contratos disponibles.</p>
      )}

      <ContractViewer
        contract={selected}
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        onSigned={() => load()}
      />
    </div>
  );
}
