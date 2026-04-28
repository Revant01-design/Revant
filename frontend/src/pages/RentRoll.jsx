import { useEffect, useMemo, useState } from "react";
import { Search, Eye, Send, CreditCard } from "lucide-react";
import { api, fmtMXN, fmtDate, daysUntil } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import StatusBadge from "../components/StatusBadge";
import { Input } from "../components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../components/ui/select";
import { Button } from "../components/ui/button";
import ContractViewer from "../components/ContractViewer";
import { toast } from "sonner";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";

export default function RentRoll() {
  const { user } = useAuth();
  const [contracts, setContracts] = useState([]);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState(null);

  const load = async () => {
    const { data } = await api.get("/contracts");
    setContracts(data);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return contracts.filter(c => {
      if (statusFilter !== "all" && c.estatus !== statusFilter) return false;
      if (q) {
        const s = q.toLowerCase();
        if (!c.inquilino_nombre.toLowerCase().includes(s) && !c.propiedad_nombre.toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [contracts, q, statusFilter]);

  const totalCobrado = filtered.filter(c => c.estatus === "pagado").reduce((s, c) => s + c.monto_renta, 0);
  const totalEsperado = filtered.reduce((s, c) => s + c.monto_renta, 0);

  const updateStatus = async (id, estatus) => {
    await api.patch(`/contracts/${id}/status`, { estatus });
    load();
  };

  const sendReminder = async (id, withLink = false) => {
    try {
      const { data } = await api.post(`/contracts/${id}/remind`, {
        include_payment_link: withLink,
        origin: window.location.origin,
      });
      if (data.simulated) {
        toast.success(withLink ? "Recordatorio (con liga) simulado" : "Recordatorio simulado");
      } else {
        toast.success(`Recordatorio enviado a ${data.to}${withLink ? " · con liga de pago" : ""}`);
      }
    } catch {
      toast.error("Error al enviar recordatorio");
    }
  };

  const createCheckout = async (id, months = 1) => {
    try {
      const { data } = await api.post(`/payments/checkout`, {
        contract_id: id,
        origin: window.location.origin,
        months,
      });
      window.open(data.url, "_blank");
      toast.success("Liga de pago abierta en nueva pestaña");
    } catch {
      toast.error("Error al crear liga de pago");
    }
  };

  return (
    <div className="space-y-6" data-testid="rent-roll-page">
      {/* Summary strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Box label="Rentas cobradas" value={fmtMXN(totalCobrado)} accent />
        <Box label="Total esperado" value={fmtMXN(totalEsperado)} />
        <Box label="Contratos visibles" value={filtered.length} />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            data-testid="search-input"
            placeholder="Buscar por inquilino o propiedad…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9 h-11 bg-white"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-56 h-11 bg-white" data-testid="status-filter">
            <SelectValue placeholder="Estatus" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estatus</SelectItem>
            <SelectItem value="pagado">Pagado</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="atrasado">Atrasado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left">
                <Th>Inquilino</Th>
                <Th>Propiedad</Th>
                <Th>Monto</Th>
                <Th>Vencimiento</Th>
                <Th>Estatus</Th>
                <Th className="text-right">Acciones</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">Sin resultados.</td></tr>
              )}
              {filtered.map((c) => {
                const d = daysUntil(c.fecha_vencimiento);
                return (
                  <tr key={c.contract_id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors" data-testid={`row-${c.contract_id}`}>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-[#031433]">{c.inquilino_nombre}</p>
                      <p className="text-xs text-slate-500">{c.inquilino_email}</p>
                    </td>
                    <td className="px-6 py-4 text-[#031433]">{c.propiedad_nombre}</td>
                    <td className="px-6 py-4 font-semibold text-[#031433]">{fmtMXN(c.monto_renta)}</td>
                    <td className="px-6 py-4">
                      <p className="text-[#031433]">{fmtDate(c.fecha_vencimiento)}</p>
                      <p className={`text-xs ${d <= 7 ? "text-red-600" : d <= 30 ? "text-amber-700" : "text-slate-500"}`}>
                        {d < 0 ? `Vencido hace ${Math.abs(d)}d` : d === 0 ? "Vence hoy" : `${d}d restantes`}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      {user?.role === "admin" ? (
                        <Select value={c.estatus} onValueChange={(v) => updateStatus(c.contract_id, v)}>
                          <SelectTrigger className="h-8 w-[130px] border-0 bg-transparent p-0 hover:bg-transparent focus:ring-0" data-testid={`status-select-${c.contract_id}`}>
                            <StatusBadge status={c.estatus} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pagado">Pagado</SelectItem>
                            <SelectItem value="pendiente">Pendiente</SelectItem>
                            <SelectItem value="atrasado">Atrasado</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : <StatusBadge status={c.estatus} />}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        {user?.role === "admin" && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                data-testid={`pay-${c.contract_id}`}
                                variant="ghost" size="sm"
                                title="Cobranza"
                                className="h-9 hover:bg-[#D3A154] hover:text-[#031433] text-[#031433] transition-all duration-200"
                              >
                                <CreditCard className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-64">
                              <DropdownMenuItem data-testid={`checkout-1m-${c.contract_id}`} onClick={() => createCheckout(c.contract_id, 1)}>
                                Crear liga de pago (1 mes)
                              </DropdownMenuItem>
                              <DropdownMenuItem data-testid={`checkout-3m-${c.contract_id}`} onClick={() => createCheckout(c.contract_id, 3)}>
                                Crear liga de pago (3 meses)
                              </DropdownMenuItem>
                              <DropdownMenuItem data-testid={`remind-link-${c.contract_id}`} onClick={() => sendReminder(c.contract_id, true)}>
                                Enviar recordatorio + liga de pago
                              </DropdownMenuItem>
                              <DropdownMenuItem data-testid={`remind-${c.contract_id}`} onClick={() => sendReminder(c.contract_id, false)}>
                                Enviar recordatorio simple
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                        <Button
                          data-testid={`view-${c.contract_id}`}
                          onClick={() => setSelected(c)}
                          variant="ghost"
                          className="h-9 hover:bg-[#031433] hover:text-white text-[#031433] transition-all duration-200"
                        >
                          <Eye className="w-4 h-4 mr-1.5" /> Ver
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ContractViewer
        contract={selected}
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        onSigned={() => load()}
      />
    </div>
  );
}

function Th({ children, className = "" }) {
  return (
    <th className={`px-6 py-3 text-[10px] uppercase tracking-[0.18em] font-semibold text-slate-500 ${className}`}>
      {children}
    </th>
  );
}

function Box({ label, value, accent }) {
  return (
    <div className={`p-5 rounded-md border ${accent ? "bg-[#031433] border-[#031433] text-white" : "bg-white border-slate-200"}`}>
      <p className={`text-[10px] uppercase tracking-[0.18em] font-semibold ${accent ? "text-[#D3A154]" : "text-slate-500"}`}>{label}</p>
      <p className={`mt-2 font-display text-2xl font-bold tracking-tight ${accent ? "text-white" : "text-[#031433]"}`}>{value}</p>
    </div>
  );
}
