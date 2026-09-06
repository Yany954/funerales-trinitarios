import { Menu, LogOut } from "lucide-react";
import { cerrarSesion } from "../api/client";
import { useRol } from "../auth/RolContext";
const SEDES = ["Pailitas", "Tamalameque", "Pelaya", "Curumaní"] as const;


interface Props {
  titulo: string;
  onAbrirMenu: () => void;
  correoUsuario?: string | null;
}

export default function Topbar({ titulo, onAbrirMenu, correoUsuario }: Props) {
  const { rol, sedeSeleccionada, setSedeSeleccionada } = useRol();

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
      {rol === "admin" && (
        <select
          value={sedeSeleccionada}
          onChange={(e) => setSedeSeleccionada(e.target.value as any)}
          className="rounded-md border border-vino-100 px-2 py-1.5 text-sm text-vino-700"
        >
          <option value="all">Todas las sedes</option>
          {SEDES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      )}

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
