import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { X, KeyRound, RotateCcw, Smartphone, Copy } from "lucide-react";
import { db, generarCodigoActivacion, restablecerAccesoApp } from "../api/client";
import { useDialogo } from "../hooks/useDialogo";
import { confirmarAccion } from "../utils/confirmar";
import { formatoFecha } from "../utils/formato";
import type { Afiliado } from "../types";

interface Props {
  afiliado: Pick<Afiliado, "id" | "nombreCompleto" | "cedula" | "soloSeguro">;
  onCerrar: () => void;
}

interface CuentaApp {
  uid: string;
  metodoVinculacion: "contrato" | "codigo";
  fechaCreacion: unknown;
}

/**
 * Acceso del titular a la app móvil: ver si ya tiene cuenta, generar un código
 * de activación (para quien no tiene contrato, p. ej. solo seguro de vida) o
 * restablecer el acceso si olvidó su PIN. El staff nunca ve ni pone el PIN.
 */
export default function PanelAccesoApp({ afiliado, onCerrar }: Props) {
  const [cuenta, setCuenta] = useState<CuentaApp | null>(null);
  const [cargando, setCargando] = useState(true);
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codigo, setCodigo] = useState<{ codigo: string; expira: string } | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    const cancelar = onSnapshot(
      doc(db, "cuentas_afiliado", afiliado.id),
      (snap) => {
        setCuenta(snap.exists() ? (snap.data() as CuentaApp) : null);
        setCargando(false);
      },
      (err) => {
        console.error("No se pudo leer el acceso a la app:", err);
        setError("No se pudo consultar si tiene cuenta en la app.");
        setCargando(false);
      }
    );
    return cancelar;
  }, [afiliado.id]);

  async function manejarGenerar() {
    setError(null);
    setTrabajando(true);
    try {
      setCodigo(await generarCodigoActivacion(afiliado.id));
      setCopiado(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo generar el código.");
    } finally {
      setTrabajando(false);
    }
  }

  async function manejarRestablecer() {
    const ok = await confirmarAccion(
      "¿Restablecer acceso a la app?",
      `Se borrará la cuenta de la app de ${afiliado.nombreCompleto}. Tendrá que registrarse de nuevo y crear otro PIN. Sus datos y pagos no cambian.`,
      "Sí, restablecer"
    );
    if (!ok) return;
    setError(null);
    setTrabajando(true);
    try {
      await restablecerAccesoApp(afiliado.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo restablecer el acceso.");
    } finally {
      setTrabajando(false);
    }
  }

  const mensajeParaEnviar = codigo
    ? `Funerales Los Trinitarios: tu código para activar la app es ${codigo.codigo}. Sirve una sola vez y vence el ${formatoFecha(codigo.expira)}. En la app elige "Crear cuenta", escribe tu cédula y este código.`
    : "";

  async function copiarMensaje() {
    try {
      await navigator.clipboard.writeText(mensajeParaEnviar);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  }

  const refDialogo = useDialogo(onCerrar);
  const sinCedula = !afiliado.cedula?.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-tinta/40 p-4">
      <div ref={refDialogo} role="dialog" aria-modal="true" className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-display text-lg text-vino-900">
            <Smartphone size={18} aria-hidden="true" /> Acceso a la app
          </h3>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="rounded-lg p-1 text-tinta/70 hover:text-tinta"><X size={20} aria-hidden="true" /></button>
        </div>
        <p className="mb-4 text-sm text-tinta/80">{afiliado.nombreCompleto}</p>

        {cargando ? (
          <p className="text-sm text-tinta/70">Consultando…</p>
        ) : cuenta ? (
          <div className="space-y-3">
            <div className="rounded-lg bg-green-50 p-3 text-sm text-green-800">
              Tiene cuenta en la app desde el {formatoFecha(cuenta.fechaCreacion)}
              {cuenta.metodoVinculacion === "codigo" ? " (activada con código)." : " (activada con su contrato)."}
            </div>
            <p className="text-xs text-tinta/70">¿Olvidó su PIN? Restablece el acceso y pídele que se registre otra vez en la app.</p>
            <button type="button" disabled={trabajando} onClick={manejarRestablecer} className="flex w-full items-center justify-center gap-2 rounded-lg border border-vino-600 py-2.5 text-sm font-medium text-vino-700 hover:bg-vino-50 disabled:opacity-60">
              <RotateCcw size={16} aria-hidden="true" /> {trabajando ? "Restableciendo…" : "Restablecer acceso"}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg bg-vino-50 p-3 text-sm text-tinta/80">
              Todavía no tiene cuenta en la app.{" "}
              {afiliado.soloSeguro
                ? "Como es titular de solo seguro de vida (sin contrato), necesita un código de activación."
                : "Puede registrarse solo con su cédula y su número de contrato, o con un código de activación."}
            </div>
            {sinCedula && (
              <p role="alert" className="text-sm text-red-600">No tiene cédula registrada. Agrégala en "Editar" antes de generar el código.</p>
            )}
            {codigo ? (
              <div className="space-y-2 rounded-lg border border-vino-100 p-3">
                <p className="text-xs text-tinta/70">Código de activación (un solo uso, vence el {formatoFecha(codigo.expira)}):</p>
                <p className="text-center font-mono text-3xl tracking-widest text-vino-900">{codigo.codigo}</p>
                <p className="text-xs text-tinta/70">Anótalo o envíalo ahora: por seguridad no se puede volver a ver. Si se pierde, genera otro.</p>
                <button type="button" onClick={copiarMensaje} className="flex w-full items-center justify-center gap-2 rounded-lg bg-vino-50 py-2 text-sm text-vino-700 hover:bg-vino-100">
                  <Copy size={14} aria-hidden="true" /> {copiado ? "¡Mensaje copiado!" : "Copiar mensaje para WhatsApp"}
                </button>
              </div>
            ) : null}
            <button type="button" disabled={trabajando || sinCedula} onClick={manejarGenerar} className="flex w-full items-center justify-center gap-2 rounded-lg bg-vino-700 py-2.5 text-sm font-medium text-white hover:bg-vino-600 disabled:opacity-60">
              <KeyRound size={16} aria-hidden="true" /> {trabajando ? "Generando…" : codigo ? "Generar otro código" : "Generar código de activación"}
            </button>
          </div>
        )}
        {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
