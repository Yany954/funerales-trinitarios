import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/firebase/config";
import { useSesion } from "@/auth/SesionContext";

/** Lo que la app muestra del titular (Fase 1: lo mínimo; la Fase 2 agrega más). */
export interface AfiliadoApp {
  id: string;
  nombreCompleto: string;
  numeroContrato?: string;
  estadoPlan: "activo" | "en mora" | "inactivo";
  soloSeguro?: boolean;
  tieneSeguroVida?: boolean;
  seguroVida?: { estado: "activo" | "en mora" };
}

/**
 * Documento del titular en tiempo real (onSnapshot), igual que el dashboard:
 * si en la sede registran un pago, la app se actualiza sola.
 * Las reglas de Firestore solo dejan leer el documento propio.
 */
export function useAfiliado() {
  const { afiliadoId } = useSesion();
  const [afiliado, setAfiliado] = useState<AfiliadoApp | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!afiliadoId) {
      setCargando(false);
      return;
    }
    setCargando(true);
    const cancelar = onSnapshot(
      doc(db, "afiliados", afiliadoId),
      (snap) => {
        setAfiliado(snap.exists() ? ({ id: snap.id, ...snap.data() } as AfiliadoApp) : null);
        setError(!snap.exists());
        setCargando(false);
      },
      (err) => {
        console.error("No se pudo leer el afiliado:", err.code);
        setError(true);
        setCargando(false);
      }
    );
    return cancelar;
  }, [afiliadoId]);

  return { afiliado, cargando, error };
}
