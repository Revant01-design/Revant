import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

const META = {
  "/dashboard":   { title: "Resumen Ejecutivo", subtitle: "Dashboard" },
  "/rent-roll":   { title: "Rent Roll", subtitle: "Gestión de rentas" },
  "/contracts":   { title: "Contratos Digitales", subtitle: "Documentos legales" },
  "/properties":  { title: "Portafolio", subtitle: "Propiedades" },
  "/arco":        { title: "Solicitudes ARCO", subtitle: "LFPDPPP" },
  "/audit":       { title: "Registro de auditoría", subtitle: "Trazabilidad" },
};

export default function Layout() {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const meta = META[loc.pathname] || { title: "Revant", subtitle: "" };

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onMenu={() => setOpen(true)} title={meta.title} subtitle={meta.subtitle} />
        <main className="flex-1 px-4 lg:px-8 py-6 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
