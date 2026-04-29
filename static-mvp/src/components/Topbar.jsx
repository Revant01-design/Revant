import { Menu, ChevronDown } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export default function Topbar({ onMenu, title, subtitle }) {
  const { user, switchRole, logout } = useAuth();
  const initials = (user?.name || "U").split(" ").map(s => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-100">
      <div className="flex items-center justify-between px-4 lg:px-8 py-4">
        <div className="flex items-center gap-3">
          <button onClick={onMenu} className="lg:hidden p-2 -ml-2 text-[#0A1A2F]" data-testid="open-sidebar">
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#C9B37E] font-semibold">{subtitle}</p>
            <h1 className="font-display text-xl lg:text-2xl font-bold tracking-tight text-[#0A1A2F]" data-testid="page-title">
              {title}
            </h1>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button data-testid="profile-trigger" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-50 transition-colors">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm" style={{ background: "#0A1A2F" }}>
                {user?.picture ? (
                  <img src={user.picture} alt="" className="w-full h-full rounded-full object-cover" />
                ) : initials}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-semibold text-[#0A1A2F] leading-tight" data-testid="user-name">{user?.name}</p>
                <p className="text-[11px] uppercase tracking-wider text-slate-500">
                  {user?.role === "admin" ? "Administrador" : "Inquilino"}
                </p>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 hidden md:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>
              <div>
                <p className="font-semibold text-[#0A1A2F]">{user?.name}</p>
                <p className="text-xs text-slate-500 font-normal">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
              Vista demo
            </DropdownMenuLabel>
            <DropdownMenuItem
              data-testid="role-admin"
              onClick={() => switchRole("admin")}
              className={user?.role === "admin" ? "bg-slate-50" : ""}
            >
              Administrador {user?.role === "admin" && <span className="ml-auto text-[#C9B37E]">●</span>}
            </DropdownMenuItem>
            <DropdownMenuItem
              data-testid="role-inquilino"
              onClick={() => switchRole("inquilino")}
              className={user?.role === "inquilino" ? "bg-slate-50" : ""}
            >
              Inquilino {user?.role === "inquilino" && <span className="ml-auto text-[#C9B37E]">●</span>}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} data-testid="logout-menu">
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
