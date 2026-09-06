import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { User } from "firebase/auth";

export type Rol = "admin" | "empleado";
export type Sede = "Pailitas" | "Tamalameque" | "Pelaya" | "Curumaní";

interface RolContextValue {
  rol: Rol | null;
  sedeAsignada: Sede | "all" | null;
  sedeSeleccionada: Sede | "all";
  setSedeSeleccionada: (s: Sede | "all") => void;
  cargando: boolean;
}

const RolContext = createContext<RolContextValue | null>(null);

export function RolProvider({ user, children }: { user: User; children: ReactNode }) {
  const [rol, setRol] = useState<Rol | null>(null);
  const [sedeAsignada, setSedeAsignada] = useState<Sede | "all" | null>(null);
  const [sedeSeleccionada, setSedeSeleccionada] = useState<Sede | "all">("Pailitas");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    user.getIdTokenResult(true).then((token) => {
      const claims = token.claims as { rol?: Rol; sede?: Sede | "all" };
      const rolReal = claims.rol ?? "empleado";
      const sedeReal = claims.sede ?? "Pailitas";
      setRol(rolReal);
      setSedeAsignada(sedeReal);
      setSedeSeleccionada(rolReal === "admin" ? "all" : (sedeReal as Sede));
      setCargando(false);
    });
  }, [user]);

  return (
    <RolContext.Provider value={{ rol, sedeAsignada, sedeSeleccionada, setSedeSeleccionada, cargando }}>
      {children}
    </RolContext.Provider>
  );
}

export function useRol() {
  const ctx = useContext(RolContext);
  if (!ctx) throw new Error("useRol debe usarse dentro de <RolProvider>");
  return ctx;
}