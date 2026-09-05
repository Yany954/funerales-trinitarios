import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { auth } from "../api/client";

const TITULOS: Record<string, string> = {
  "/": "Inicio",
  "/afiliados": "Afiliados",
  "/servicios": "Servicios",
  "/convenios": "Convenios",
  "/cofres": "Cofres",
  "/inventario": "Inventario",
  "/bovedas": "Bóvedas",
  "/flores": "Flores",
  "/planes": "Planes funerarios",
  "/reportes": "Reportes",
};

export default function DashboardLayout() {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const location = useLocation();
  const titulo = TITULOS[location.pathname] ?? "Los Trinitarios";

  return (
    <div className="flex h-screen bg-crema">
      <Sidebar abiertoEnMovil={menuAbierto} onCerrar={() => setMenuAbierto(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          titulo={titulo}
          onAbrirMenu={() => setMenuAbierto(true)}
          correoUsuario={auth.currentUser?.email}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
