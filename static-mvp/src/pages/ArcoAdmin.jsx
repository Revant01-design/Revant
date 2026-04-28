import { useEffect, useState } from "react";
import { api, fmtDate } from "../lib/api";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { toast } from "sonner";

const STATUS_BADGE = {
  pendiente: "bg-amber-50 text-amber-800 border-amber-200",
  en_proceso: "bg-blue-50 text-blue-700 border-blue-200",
  resuelto: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rechazado: "bg-red-50 text-red-700 border-red-200",
};

export default function ArcoAdmin() {
  const [items, setItems] = useState([]);
  const [sel, setSel] = useState(null);
  const [estatus, setEstatus] = useState("pendiente");
  const [notas, setNotas] = useState("");

  const load = async () => {
    const { data } = await api.get("/arco");
    setItems(data);
  };
  useEffect(() => { load(); }, []);

  const open = (item) => {
    setSel(item);
    setEstatus(item.estatus);
    setNotas(item.notas_resolucion || "");
  };

  const save = async () => {
    await api.patch(`/arco/${sel.request_id}`, { estatus, notas_resolucion: notas });
    toast.success("Solicitud actualizada");
    setSel(null); load();
  };

  return (
    <div className="space-y-6" data-testid="arco-admin-page">
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left">
                <Th>Folio</Th><Th>Tipo</Th><Th>Titular</Th><Th>Recibido</Th><Th>Estatus</Th><Th className="text-right">Acción</Th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">Sin solicitudes ARCO.</td></tr>}
              {items.map((r) => (
                <tr key={r.request_id} className="border-b border-slate-100 hover:bg-slate-50" data-testid={`arco-row-${r.request_id}`}>
                  <td className="px-6 py-4 font-mono text-xs text-[#031433]">{r.request_id}</td>
                  <td className="px-6 py-4 capitalize text-[#031433]">{r.tipo}</td>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-[#031433]">{r.nombre_completo}</p>
                    <p className="text-xs text-slate-500">{r.email}</p>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{fmtDate(r.created_at)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${STATUS_BADGE[r.estatus]}`}>
                      {r.estatus.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button onClick={() => open(r)} variant="ghost" size="sm" data-testid={`arco-open-${r.request_id}`}
                            className="hover:bg-[#031433] hover:text-white text-[#031433]">Gestionar</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!sel} onOpenChange={(o) => !o && setSel(null)}>
        <DialogContent className="max-w-xl" data-testid="arco-dialog">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl tracking-tight text-[#031433]">
              Solicitud {sel?.request_id}
            </DialogTitle>
          </DialogHeader>
          {sel && (
            <div className="space-y-4 text-sm">
              <Row k="Tipo" v={<span className="capitalize">{sel.tipo}</span>} />
              <Row k="Titular" v={<span>{sel.nombre_completo} · {sel.email}</span>} />
              <Row k="Identificación" v={<span>{sel.identificacion_tipo} {sel.identificacion_numero}</span>} />
              <Row k="Teléfono" v={sel.telefono || "—"} />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">Descripción</p>
                <p className="text-[#031433] bg-slate-50 border border-slate-200 rounded-md p-3">{sel.descripcion}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-2">Estatus</p>
                  <Select value={estatus} onValueChange={setEstatus}>
                    <SelectTrigger className="h-11 bg-white" data-testid="arco-status-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendiente">Pendiente</SelectItem>
                      <SelectItem value="en_proceso">En proceso</SelectItem>
                      <SelectItem value="resuelto">Resuelto</SelectItem>
                      <SelectItem value="rechazado">Rechazado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-2">Notas de resolución</p>
                <Textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={3} data-testid="arco-notes" />
              </div>
              <Button onClick={save} className="w-full h-11 bg-[#D3A154] text-[#031433] hover:bg-[#D3A154]/90" data-testid="arco-save">
                Guardar cambios
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Th({ children, className = "" }) {
  return <th className={`px-6 py-3 text-[10px] uppercase tracking-[0.18em] font-semibold text-slate-500 ${className}`}>{children}</th>;
}

function Row({ k, v }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
      <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{k}</span>
      <span className="text-[#031433] font-medium text-right">{v}</span>
    </div>
  );
}
