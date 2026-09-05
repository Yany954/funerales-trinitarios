import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Handshake,
  Package,
  Warehouse,
  Landmark,
  Flower2,
  CreditCard,
  BarChart3,
  X,
} from "lucide-react";

const items = [
  { to: "/", label: "Inicio", icon: LayoutDashboard, end: true },
  { to: "/afiliados", label: "Afiliados", icon: Users },
  { to: "/servicios", label: "Servicios", icon: ClipboardList },
  { to: "/convenios", label: "Convenios", icon: Handshake },
  { to: "/cofres", label: "Cofres", icon: Package },
  { to: "/inventario", label: "Inventario", icon: Warehouse },
  { to: "/bovedas", label: "Bóvedas", icon: Landmark },
  { to: "/flores", label: "Flores", icon: Flower2 },
  { to: "/planes", label: "Planes funerarios", icon: CreditCard },
  { to: "/reportes", label: "Reportes", icon: BarChart3 },
];

interface Props {
  abiertoEnMovil: boolean;
  onCerrar: () => void;
}

export default function Sidebar({ abiertoEnMovil, onCerrar }: Props) {
  return (
    <>
      {/* Fondo oscuro detrás del panel cuando está abierto en móvil */}
      {abiertoEnMovil && (
        <div
          className="fixed inset-0 z-30 bg-tinta/40 md:hidden"
          onClick={onCerrar}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed z-40 inset-y-0 left-0 w-64 bg-vino-700 text-crema flex flex-col
          transform transition-transform duration-200 ease-out
          md:static md:translate-x-0
          ${abiertoEnMovil ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between px-5 py-5 border-b border-vino-600/60">
          <div>
            <p className="font-display text-lg leading-tight">Los Trinitarios</p>
            <p className="text-xs text-vino-100/70">Panel interno</p>
          </div>
          <button className="md:hidden p-1" onClick={onCerrar} aria-label="Cerrar menú">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onCerrar}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  isActive
                    ? "bg-buganvilla/90 text-white font-medium"
                    : "text-vino-100/85 hover:bg-vino-600/60"
                }`
              }
            >
              <Icon size={18} strokeWidth={2} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
