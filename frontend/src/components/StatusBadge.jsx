const MAP = {
  pagado:    { label: "Pagado",    cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  pendiente: { label: "Pendiente", cls: "bg-amber-50 text-amber-800 border-amber-200" },
  atrasado:  { label: "Atrasado",  cls: "bg-red-50 text-red-700 border-red-200" },
};

export default function StatusBadge({ status }) {
  const m = MAP[status] || MAP.pendiente;
  return (
    <span
      data-testid={`status-${status}`}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${m.cls}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${
        status === "pagado" ? "bg-emerald-500" : status === "atrasado" ? "bg-red-500" : "bg-amber-500"
      }`} />
      {m.label}
    </span>
  );
}
