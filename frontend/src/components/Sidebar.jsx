import { NavLink } from "react-router-dom";
import { LayoutDashboard, Table2, FileText, Building2, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const items = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard", testid: "nav-dashboard" },
  { to: "/rent-roll", icon: Table2, label: "Rent Roll", testid: "nav-rent-roll" },
  { to: "/contracts", icon: FileText, label: "Contratos", testid: "nav-contracts" },
  { to: "/properties", icon: Building2, label: "Propiedades", testid: "nav-properties" },
];

export default function Sidebar({ open, onClose }) {
  const { logout } = useAuth();

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={onClose} />}
      <aside
        data-testid="sidebar"
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#031433] text-white flex flex-col transform transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        <div className="px-6 py-6 border-b border-white/10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-md flex items-center justify-center" style={{ background: "#D3A154" }}>
            <Building2 className="w-5 h-5 text-[#031433]" />
          </div>
          <div>
            <p className="font-display text-xl font-bold tracking-tight">REVANT</p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#D3A154]">PropTech</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-1">
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              data-testid={it.testid}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-white/10 text-white border-l-2 border-[#D3A154] pl-[14px]"
                    : "text-white/70 hover:text-white hover:bg-white/5"
                }`
              }
            >
              <it.icon className="w-4 h-4" />
              {it.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-white/10">
          <button
            data-testid="logout-btn"
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-md transition-colors"
          >
            <LogOut className="w-4 h-4" /> Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}
