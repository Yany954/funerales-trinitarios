import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { auth } from "@/firebase/config";

interface Sesion {
  usuario: User | null;
  /** id del documento en "afiliados" — sale del token, lo puso el backend. */
  afiliadoId: string | null;
  cargando: boolean;
}

const SesionContext = createContext<Sesion>({ usuario: null, afiliadoId: null, cargando: true });

/**
 * Escucha la sesión de Firebase y lee los claims del token.
 * Solo se acepta rol "afiliado": si alguien del staff (o una cuenta sin rol)
 * entra a la app, se cierra la sesión — la app es solo para titulares.
 */
export function SesionProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Sesion>({ usuario: null, afiliadoId: null, cargando: true });

  useEffect(() => {
    const cancelar = onAuthStateChanged(auth, async (usuario) => {
      if (!usuario) {
        setSesion({ usuario: null, afiliadoId: null, cargando: false });
        return;
      }
      try {
        const { claims } = await usuario.getIdTokenResult();
        if (claims.rol === "afiliado" && typeof claims.afiliadoId === "string") {
          setSesion({ usuario, afiliadoId: claims.afiliadoId, cargando: false });
        } else {
          await signOut(auth);
        }
      } catch (err) {
        console.error("No se pudo leer la sesión:", err);
        setSesion({ usuario: null, afiliadoId: null, cargando: false });
      }
    });
    return cancelar;
  }, []);

  return <SesionContext.Provider value={sesion}>{children}</SesionContext.Provider>;
}

export function useSesion(): Sesion {
  return useContext(SesionContext);
}
