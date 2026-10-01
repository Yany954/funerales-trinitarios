import { useEffect, useState, FormEvent } from "react";
import { X, Receipt, Pencil, Trash2 } from "lucide-react";
import { listarPagosPorAfiliado, registrarPago, actualizarPago, eliminarPago } from "../api/client";
import SubirFoto from "./SubirFoto";
import CampoPrecio from "./CampoPrecio";
import { useRol } from "../auth/RolContext";
import { confirmarEliminar } from "../utils/confirmar";
import { formatoFecha, formatoPesos, formatoPeriodo, desglosarPeriodo, MESES } from "../utils/formato";
import type { Afiliado, Pago } from "../types";
import Swal from "sweetalert2";
interface Props {
  afiliado: Afiliado;
  onCerrar: () => void;
}

function aInputDate(valor: unknown): string {
  const fecha = new Date(valor as string);
  return isNaN(fecha.getTime()) ? "" : fecha.toISOString().slice(0, 10);
}

export default function PanelPagos({ afiliado, onCerrar }: Props) {
  const { rol } = useRol();
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState<Pago | null>(null);
  const [version, setVersion] = useState(0); // fuerza un formulario limpio tras guardar
  const [comprobanteURL, setComprobanteURL] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cargar() {
    try {
      setPagos(await listarPagosPorAfiliado(afiliado.id));
    } catch (err) {
      console.error("Error cargando pagos:", err);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, [afiliado.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function empezarEdicion(p: Pago) {
    setEditando(p);
    setComprobanteURL(p.comprobanteURL ?? "");
    setError(null);
  }

  function limpiarFormulario() {
    setEditando(null);
    setComprobanteURL("");
    setVersion((v) => v + 1);
  }

  async function manejarGuardar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    const form = new FormData(e.currentTarget);
    const datos = {
      fecha: String(form.get("fecha")),
      valor: Number(form.get("valor")),
      periodoCubierto: `${form.get("anio")}-${String(form.get("mes")).padStart(2, "0")}`,
      comprobanteURL: comprobanteURL || undefined,
      numeroRecibo: String(form.get("numeroRecibo") || "") || undefined,
    };
    const yaExiste = pagos.some(
      (p) => p.id !== editando?.id && p.periodoCubierto === datos.periodoCubierto
    );
    if (yaExiste) {
      Swal.fire({
        title: "Mes ya cubierto",
        text: `Ya existe un pago que cubre ${formatoPeriodo(datos.periodoCubierto)}. Edita ese pago en vez de crear uno nuevo.`,
        icon: "warning",
        confirmButtonColor: "#5E2138",
      });
      setGuardando(false);
      return;
    }
    try {
      if (editando) {
        await actualizarPago({ id: editando.id, ...datos });
      } else {
        await registrarPago({ afiliadoId: afiliado.id, sede: afiliado.sede, ...datos });
      }
      limpiarFormulario();
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el pago.");
    } finally {
      setGuardando(false);
    }
  }

  async function manejarEliminar(p: Pago) {
    const confirmado = await confirmarEliminar(`el pago de ${formatoPeriodo(p.periodoCubierto)}`);
    if (!confirmado) return;
    try {
      await eliminarPago(p.id);
      if (editando?.id === p.id) limpiarFormulario();
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar el pago.");
    }
  }

  const hoy = new Date();
  const { mes, anio } = editando
    ? desglosarPeriodo(editando.periodoCubierto, editando.fecha)
    : { mes: hoy.getMonth() + 1, anio: hoy.getFullYear() };

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

        <form key={editando?.id ?? `nuevo-${version}`} onSubmit={manejarGuardar} className="space-y-3 rounded-xl border border-vino-100 p-4">
          <p className="text-sm font-medium text-vino-900">{editando ? "Editando pago" : "Nuevo pago"}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-tinta/50">Fecha en que pagó</label>
              <input name="fecha" type="date" required defaultValue={editando ? aInputDate(editando.fecha) : ""} className="w-full rounded-lg border border-vino-100 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-tinta/50">Mes que cubre el pago</label>
              <div className="flex gap-2">
                <select name="mes" defaultValue={mes} className="flex-1 rounded-lg border border-vino-100 px-2 py-2 text-sm">
                  {MESES.map((n, idx) => (
                    <option key={n} value={idx + 1}>{n}</option>
                  ))}
                </select>
                <input name="anio" type="number" required defaultValue={anio} className="w-20 rounded-lg border border-vino-100 px-2 py-2 text-sm" />
              </div>
            </div>
            <div className="sm:col-span-2">
              <CampoPrecio name="valor" required placeholder="Valor pagado" valorInicial={editando?.valor ?? afiliado.valorCuotaMensual} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-tinta/50">N° de recibo (opcional)</label>
              <input name="numeroRecibo" defaultValue={editando?.numeroRecibo} placeholder="Ej. 1023" className="w-full rounded-lg border border-vino-100 px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-tinta/50">Comprobante (opcional)</p>
            <SubirFoto carpeta={`pagos/${afiliado.sede}/${afiliado.id}`} valorActual={editando?.comprobanteURL} onSubido={setComprobanteURL} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={guardando} className="flex items-center gap-2 rounded-lg bg-vino-700 px-4 py-2 text-sm font-medium text-white hover:bg-vino-600 disabled:opacity-60">
              <Receipt size={16} />
              {guardando ? "Guardando…" : editando ? "Guardar cambios" : "Guardar pago"}
            </button>
            {editando && (
              <button type="button" onClick={limpiarFormulario} className="rounded-lg border border-vino-100 px-4 py-2 text-sm text-tinta/60">Cancelar</button>
            )}
          </div>
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
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                  <div>
                    <p className="font-medium text-vino-900">{formatoPeriodo(p.periodoCubierto)} — {formatoPesos(p.valor)}</p>
                    <p className="text-xs text-tinta/50">
                      Pagado el {formatoFecha(p.fecha)}{p.numeroRecibo ? ` — recibo N° ${p.numeroRecibo}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {p.comprobanteURL && (
                      <a href={p.comprobanteURL} target="_blank" rel="noreferrer" className="rounded-lg px-2 py-1.5 text-xs text-vino-700 hover:bg-vino-50">Ver comprobante</a>
                    )}
                    <button onClick={() => empezarEdicion(p)} className="rounded-lg p-2 text-vino-700 hover:bg-vino-50"><Pencil size={16} /></button>
                    {rol === "admin" && (
                      <button onClick={() => manejarEliminar(p)} className="rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 size={16} /></button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}