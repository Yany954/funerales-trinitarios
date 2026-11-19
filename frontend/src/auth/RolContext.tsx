import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getAuth, signOut } from "firebase/auth";
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
  const [sinAcceso, setSinAcceso] = useState(false);
  const [sinConexion, setSinConexion] = useState(false);

  useEffect(() => {
    let cancelado = false;
    const aplicar = (claims: { rol?: Rol; sede?: Sede | "all" }) => {
      if (cancelado) return;
      if (claims.rol !== "admin" && claims.rol !== "empleado") {
        // Cuenta sin rol (no la creó un administrador): no entra al panel.
        setSinAcceso(true);
        setCargando(false);
        return;
      }
      setSinAcceso(false);
      const rolReal = claims.rol;
      const sedeReal = claims.sede ?? "Pailitas";
      setRol(rolReal);
      setSedeAsignada(sedeReal);
      setSedeSeleccionada(rolReal === "admin" ? "all" : (sedeReal as Sede));
      setCargando(false);
    };
    // Antes se pedía siempre un token nuevo a la red y, si fallaba, la app se
    // quedaba en "Cargando…" para siempre. Ahora se usa el token guardado y, si
    // eso falla, se reintenta con uno nuevo a los pocos segundos.
    const cargar = async (intento: number) => {
      try {
        const token = await user.getIdTokenResult(intento > 0);
        aplicar(token.claims as { rol?: Rol; sede?: Sede | "all" });
        // En segundo plano, un token nuevo por si le cambiaron el rol o la sede hace poco.
        if (intento === 0) {
          user
            .getIdTokenResult(true)
            .then((nuevo) => aplicar(nuevo.claims as { rol?: Rol; sede?: Sede | "all" }))
            .catch(() => undefined);
        }
      } catch (err) {
        console.error("No se pudo leer el rol del usuario:", err);
        if (cancelado) return;
        if (intento < 5) setTimeout(() => cargar(intento + 1), 2000 * (intento + 1));
        // Agotados los reintentos: se muestra el problema en vez de "Cargando…" eterno.
        else setSinConexion(true);
      }
    };
    cargar(0);
    return () => {
      cancelado = true;
    };
  }, [user]);

  if (sinConexion) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-crema p-6">
        <div role="alert" className="max-w-md rounded-2xl border border-vino-100 bg-white p-6 text-center">
          <h1 className="font-display text-xl text-vino-900">No se pudo cargar tu cuenta</h1>
          <p className="mt-2 text-sm text-tinta/70">Parece que no hay conexión a internet. Revisa la conexión y vuelve a intentar.</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-5 min-h-[44px] rounded-lg bg-vino-700 px-5 text-sm font-medium text-white hover:bg-vino-600"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (sinAcceso) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-crema p-6">
        <div role="alert" className="max-w-md rounded-2xl border border-vino-100 bg-white p-6 text-center">
          <h1 className="font-display text-xl text-vino-900">Tu cuenta no tiene acceso</h1>
          <p className="mt-2 text-sm text-tinta/70">
            Iniciaste sesión como {user.email}, pero esta cuenta no tiene un rol asignado. Pide a un administrador que te dé acceso desde la página Usuarios.
          </p>
          <button
            onClick={() => signOut(getAuth())}
            className="mt-5 min-h-[44px] rounded-lg bg-vino-700 px-5 text-sm font-medium text-white hover:bg-vino-600"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

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