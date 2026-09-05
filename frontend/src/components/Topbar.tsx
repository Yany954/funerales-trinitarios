import { Menu, LogOut } from "lucide-react";
import { cerrarSesion } from "../api/client";

interface Props {
  titulo: string;
  onAbrirMenu: () => void;
  correoUsuario?: string | null;
}

export default function Topbar({ titulo, onAbrirMenu, correoUsuario }: Props) {
  return (
    <header className="flex items-center justify-between border-b border-vino-100 bg-white px-4 py-4 md:px-8">
      <div className="flex items-center gap-3">
        <button
          className="md:hidden p-1.5 -ml-1.5 text-vino-700"
          onClick={onAbrirMenu}
          aria-label="Abrir menú"
        >
          <Menu size={22} />
        </button>
        <h1 className="font-display text-xl text-vino-900">{titulo}</h1>
      </div>

      {correoUsuario && (
        <div className="flex items-center gap-3 text-sm text-tinta/70">
          <span className="hidden sm:inline">{correoUsuario}</span>
          <button
            onClick={() => cerrarSesion()}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 hover:bg-vino-50 text-vino-700"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      )}
    </header>
  );
}
