import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/firebase/config";
import { useSesion } from "@/auth/SesionContext";
import type { VistaAfiliado } from "./tipos";

interface EstadoVista {
  vista: VistaAfiliado | null;
  cargando: boolean;
  /** true si no hay vista (afiliado borrado o sin acceso) o falló la lectura. */
  error: boolean;
}

const VistaContext = createContext<EstadoVista>({ vista: null, cargando: true, error: false });

/**
 * Una sola escucha en tiempo real de "vista_afiliado/{suId}" para todas las
 * pestañas. La arma el backend: si en la sede registran un pago o cambian un
 * beneficiario, la app se actualiza sola.
 */
export function VistaProvider({ children }: { children: ReactNode }) {
  const { afiliadoId } = useSesion();
  const [estado, setEstado] = useState<EstadoVista>({ vista: null, cargando: true, error: false });

  useEffect(() => {
    if (!afiliadoId) {
      setEstado({ vista: null, cargando: false, error: true });
      return;
    }
    setEstado((e) => ({ ...e, cargando: true }));
    return onSnapshot(
      doc(db, "vista_afiliado", afiliadoId),
      (snap) => setEstado({ vista: snap.exists() ? (snap.data() as VistaAfiliado) : null, cargando: false, error: !snap.exists() }),
      (err) => {
        console.error("No se pudo leer la vista:", err.code);
        setEstado({ vista: null, cargando: false, error: true });
      }
    );
  }, [afiliadoId]);

  return <VistaContext.Provider value={estado}>{children}</VistaContext.Provider>;
}

export function useVista(): EstadoVista {
  return useContext(VistaContext);
}
