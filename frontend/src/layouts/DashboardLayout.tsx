import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { auth } from "../api/client";

const TITULOS: Record<string, string> = {
  "/": "Inicio",
  "/afiliados": "Afiliados",
  "/seguros-vida": "Seguros de vida",
  "/servicios": "Servicios",
  "/convenios": "Convenios",
  "/cofres": "Cofres",
  "/inventario": "Inventario",
  "/bovedas": "Bóvedas",
  "/flores": "Flores",
  "/planes": "Planes funerarios",
  "/reportes": "Reportes",
  "/facturacion": "Facturación",
  "/usuarios": "Usuarios",
};

export default function DashboardLayout() {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const location = useLocation();
  const titulo = TITULOS[location.pathname] ?? "Los Trinitarios";

  // Cada página con su propio título en la pestaña (lo anuncian los lectores de pantalla).
  useEffect(() => {
    document.title = `${titulo} — Los Trinitarios`;
  }, [titulo]);

  return (
    <div className="flex h-screen bg-crema">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-vino-700 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        Saltar al contenido
      </a>
      <Sidebar abiertoEnMovil={menuAbierto} onCerrar={() => setMenuAbierto(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          titulo={titulo}
          onAbrirMenu={() => setMenuAbierto(true)}
          correoUsuario={auth.currentUser?.email}
        />
        <main id="contenido" tabIndex={-1} className="flex-1 overflow-y-auto p-4 focus:outline-none md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
