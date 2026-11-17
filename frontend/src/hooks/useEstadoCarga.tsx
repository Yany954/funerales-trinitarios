import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

/** Después de este tiempo sin respuesta de la base de datos se ofrece reintentar. */
const MS_ANTES_DE_AVISAR = 15000;

export interface EstadoCarga {
  cargando: boolean;
  error: string | null;
  lento: boolean;
  /** Cambia en cada reintento: inclúyelo en las dependencias del useEffect que abre la consulta. */
  intento: number;
  listo: () => void;
  fallo: (err: unknown) => void;
  reintentar: () => void;
}

function mensajeDeError(err: unknown): string {
  const codigo = (err as { code?: string })?.code ?? "";
  if (codigo === "permission-denied") return "No tienes permiso para ver estos datos. Si te cambiaron el rol o la sede, cierra sesión y vuelve a entrar.";
  if (codigo === "unavailable") return "No hay conexión con la base de datos. Revisa el internet.";
  if (codigo === "failed-precondition") return "La base de datos todavía está preparando un índice para esta consulta. Intenta de nuevo en unos minutos.";
  return "No se pudieron cargar los datos.";
}

/**
 * Estado de carga para una consulta en vivo (onSnapshot). Evita que la página
 * se quede para siempre en "Cargando…" cuando la consulta falla o la conexión
 * se cuelga: muestra el error y un botón para reintentar.
 */
export function useEstadoCarga(): EstadoCarga {
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lento, setLento] = useState(false);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    if (!cargando) {
      setLento(false);
      return;
    }
    const t = setTimeout(() => setLento(true), MS_ANTES_DE_AVISAR);
    return () => clearTimeout(t);
  }, [cargando, intento]);

  const listo = useCallback(() => {
    setCargando(false);
    setError(null);
  }, []);

  const fallo = useCallback((err: unknown) => {
    console.error("Error en la consulta:", err);
    setError(mensajeDeError(err));
    setCargando(false);
  }, []);

  const reintentar = useCallback(() => {
    setError(null);
    setLento(false);
    setCargando(true);
    setIntento((n) => n + 1);
  }, []);

  return { cargando, error, lento, intento, listo, fallo, reintentar };
}

/** Aviso con botón "Reintentar" cuando la consulta falló o está tardando demasiado. */
export function AvisoCarga({ carga }: { carga: EstadoCarga }) {
  if (!carga.error && !(carga.cargando && carga.lento)) return null;
  const esError = !!carga.error;
  return (
    <div
      role={esError ? "alert" : "status"}
      className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${
        esError ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-900"
      }`}
    >
      <span className="flex items-center gap-2">
        <AlertTriangle size={16} aria-hidden="true" className="shrink-0" />
        {carga.error ?? "Está tardando más de lo normal en cargar. Puede ser la conexión."}
      </span>
      <button
        type="button"
        onClick={carga.reintentar}
        className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 font-medium shadow-sm ring-1 ring-inset ring-current/20 hover:bg-white/70"
      >
        <RefreshCw size={14} aria-hidden="true" /> Reintentar
      </button>
    </div>
  );
}
