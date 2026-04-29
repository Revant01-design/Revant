import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { api, fmtMXN } from "../lib/api";

export default function Properties() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    (async () => {
      const { data } = await api.get("/properties");
      setItems(data);
    })();
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6" data-testid="properties-page">
      {items.map((p) => (
        <div key={p.property_id} className="bg-white border border-slate-200 rounded-md overflow-hidden lift-hover" data-testid={`property-${p.property_id}`}>
          <div className="aspect-[16/10] bg-slate-100 overflow-hidden">
            {p.imagen && <img src={p.imagen} alt={p.nombre} className="w-full h-full object-cover" />}
          </div>
          <div className="p-5">
            <div className="flex items-start justify-between mb-2">
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500 font-semibold">{p.tipo}</p>
              <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border ${p.ocupada ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-600 border-slate-200"}`}>
                {p.ocupada ? "Ocupada" : "Disponible"}
              </span>
            </div>
            <h3 className="font-display text-lg font-bold tracking-tight text-[#0A1A2F]">{p.nombre}</h3>
            <p className="mt-1 text-sm text-slate-500 inline-flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> {p.direccion}, {p.ciudad}
            </p>
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-end justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Renta mensual</p>
                <p className="font-display text-xl font-bold text-[#0A1A2F]">{fmtMXN(p.monto_renta)}</p>
              </div>
            </div>
          </div>
        </div>
      ))}
      {items.length === 0 && <p className="col-span-full text-center py-12 text-slate-500">Sin propiedades.</p>}
    </div>
  );
}
