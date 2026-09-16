import { useEffect, useState, FormEvent } from "react";
import { X, Receipt } from "lucide-react";
import { listarPagosPorAfiliado, registrarPago } from "../api/client";
import SubirFoto from "./SubirFoto";
import type { Afiliado, Pago } from "../types";
import { formatoPesos } from "../utils/formato";

interface Props {
  afiliado: Afiliado;
  onCerrar: () => void;
}

export default function PanelPagos({ afiliado, onCerrar }: Props) {
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [cargando, setCargando] = useState(true);
  const [comprobanteURL, setComprobanteURL] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listarPagosPorAfiliado(afiliado.id)
      .then(setPagos)
      .catch((err) => console.error("Error cargando pagos:", err))
      .finally(() => setCargando(false));
  }, [afiliado.id]);

  async function manejarRegistrar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!comprobanteURL) {
      setError("Sube la foto del comprobante antes de guardar.");
      return;
    }
    setError(null);
    setGuardando(true);
    const form = new FormData(e.currentTarget);
    try {
      const nuevo = await registrarPago({
        afiliadoId: afiliado.id,
        sede: afiliado.sede,
        fecha: String(form.get("fecha")),
        valor: Number(form.get("valor")),
        periodoCubierto: String(form.get("periodoCubierto")),
        comprobanteURL,
      });
      setPagos((prev) => [nuevo, ...prev]);
      setComprobanteURL("");
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar el pago.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-tinta/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg text-vino-900">Pagos — {afiliado.nombreCompleto}</h3>
            <p className="text-xs text-tinta/50">Cédula {afiliado.cedula}</p>
          </div>
          <button onClick={onCerrar} className="text-tinta/40 hover:text-tinta">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={manejarRegistrar} className="space-y-3 rounded-xl border border-vino-100 p-4">
          <p className="text-sm font-medium text-vino-900">Nuevo pago del mes</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <input name="fecha" type="date" required className="rounded-lg border border-vino-100 px-3 py-2 text-sm" />
            <input name="periodoCubierto" required placeholder="Periodo (ej. 2026-09)" className="rounded-lg border border-vino-100 px-3 py-2 text-sm" />
            <input name="valor" type="number" required placeholder="Valor pagado" className="rounded-lg border border-vino-100 px-3 py-2 text-sm sm:col-span-2" />
          </div>
          <SubirFoto carpeta={`pagos/${afiliado.sede}/${afiliado.id}`} onSubido={setComprobanteURL} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={guardando} className="flex items-center gap-2 rounded-lg bg-vino-700 px-4 py-2 text-sm font-medium text-white hover:bg-vino-600 disabled:opacity-60">
            <Receipt size={16} />
            {guardando ? "Guardando…" : "Guardar pago"}
          </button>
        </form>

        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-vino-900">Historial</p>
          {cargando ? (
            <p className="text-sm text-tinta/50">Cargando…</p>
          ) : pagos.length === 0 ? (
            <p className="text-sm text-tinta/50">Todavía no hay pagos registrados.</p>
          ) : (
            <ul className="divide-y divide-vino-50">
              {pagos.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{new Date(p.fecha).toLocaleDateString("es-CO")} — {p.periodoCubierto} — {formatoPesos(p.valor)}</span>
                  <a href={p.comprobanteURL} target="_blank" rel="noreferrer" className="text-vino-700 hover:underline">Ver comprobante</a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}