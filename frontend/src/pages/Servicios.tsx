import { useEffect, useState, FormEvent } from "react";
import { collection, onSnapshot, orderBy, query, where, Timestamp } from "firebase/firestore";
import { Plus, Trash2, ClipboardList } from "lucide-react";
import { db, registrarServicio } from "../api/client";
import DataTable from "../components/DataTable";
import { useRol } from "../auth/RolContext";
import type { Servicio, ItemServicio, TipoServicio, TipoTraslado } from "../types";

const SEDES = ["Pailitas", "Tamalameque", "Pelaya", "Curumaní"] as const;

function itemVacio(): ItemServicio {
  return { concepto: "", cantidad: 1, valorUnitario: 0, valorTotal: 0 };
}

function aFecha(valor: unknown): string {
  if (valor instanceof Timestamp) return valor.toDate().toLocaleDateString("es-CO");
  return "—";
}

export default function Servicios() {
  const { rol, sedeAsignada, sedeSeleccionada } = useRol();
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [cargando, setCargando] = useState(true);

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [items, setItems] = useState<ItemServicio[]>([itemVacio()]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const base = collection(db, "servicios");
    const q = sedeSeleccionada === "all"
      ? query(base, orderBy("fechaServicio", "desc"))
      : query(base, where("sede", "==", sedeSeleccionada), orderBy("fechaServicio", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setServicios(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Servicio)));
      setCargando(false);
    });
    return unsub;
  }, [sedeSeleccionada]);

  function actualizarItem(i: number, campo: keyof ItemServicio, valor: string) {
    setItems((prev) => {
      const copia = [...prev];
      const item = { ...copia[i], [campo]: campo === "concepto" ? valor : Number(valor) };
      item.valorTotal = item.cantidad * item.valorUnitario;
      copia[i] = item;
      return copia;
    });
  }

  const totalServicio = items.reduce((s, it) => s + it.valorTotal, 0);

  async function manejarCrear(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    const form = new FormData(e.currentTarget);
    try {
      await registrarServicio({
        fechaServicio: String(form.get("fechaServicio")),
        sede: (rol === "admin" ? String(form.get("sede")) : sedeAsignada) as Servicio["sede"],
        convenioId: String(form.get("convenioId")), // TODO: cambiar por <select> cuando exista el módulo de Convenios
        fallecido: { nombreCompleto: String(form.get("fallecidoNombre")), cedula: String(form.get("fallecidoCedula") || "") || undefined },
        tipoServicio: String(form.get("tipoServicio")) as TipoServicio,
        tipoTraslado: String(form.get("tipoTraslado")) as TipoTraslado,
        usaBoveda: form.get("usaBoveda") === "on",
        tuvoMisaOCulto: String(form.get("tuvoMisaOCulto")) as "misa" | "culto" | "ninguno",
        itemsServicio: items.filter((it) => it.concepto.trim() !== ""),
      });
      setMostrarFormulario(false);
      setItems([itemVacio()]);
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar el servicio.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg text-vino-900">Servicios</h2>
        <button
          onClick={() => setMostrarFormulario((v) => !v)}
          className="flex items-center gap-2 rounded-lg bg-buganvilla px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
        >
          <ClipboardList size={16} />
          Nuevo servicio
        </button>
      </div>

      {mostrarFormulario && (
        <form onSubmit={manejarCrear} className="space-y-4 rounded-xl border border-vino-100 bg-white p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <input name="fechaServicio" type="date" required className="rounded-lg border border-vino-100 px-3 py-2 text-sm" />
            {rol === "admin" ? (
              <select name="sede" required className="rounded-lg border border-vino-100 px-3 py-2 text-sm">
                <option value="">Sede…</option>
                {SEDES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : (
              <input type="hidden" name="sede" value={sedeAsignada ?? ""} />
            )}
            <input name="fallecidoNombre" required placeholder="Nombre del fallecido" className="rounded-lg border border-vino-100 px-3 py-2 text-sm" />
            <input name="fallecidoCedula" placeholder="Cédula del fallecido (opcional)" className="rounded-lg border border-vino-100 px-3 py-2 text-sm" />
            <input name="convenioId" required placeholder="Convenio (temporal: escribe el nombre)" className="rounded-lg border border-vino-100 px-3 py-2 text-sm" />
            <select name="tipoServicio" required className="rounded-lg border border-vino-100 px-3 py-2 text-sm">
              <option value="">Tipo de servicio…</option>
              <option value="traslado">Traslado</option>
              <option value="servicio completo">Servicio completo</option>
              <option value="traslado + servicio completo">Traslado + servicio completo</option>
            </select>
            <select name="tipoTraslado" required className="rounded-lg border border-vino-100 px-3 py-2 text-sm">
              <option value="ninguno">Sin traslado</option>
              <option value="local">Traslado local</option>
              <option value="fluvial">Traslado fluvial</option>
            </select>
            <select name="tuvoMisaOCulto" required className="rounded-lg border border-vino-100 px-3 py-2 text-sm">
              <option value="ninguno">Sin misa ni culto</option>
              <option value="misa">Misa</option>
              <option value="culto">Culto</option>
            </select>
            <label className="flex items-center gap-2 text-sm text-tinta/70">
              <input type="checkbox" name="usaBoveda" />
              Usa bóveda
            </label>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-vino-900">Ítems del servicio</p>
            {items.map((item, i) => (
              <div key={i} className="grid grid-cols-[1fr_5rem_7rem_2rem] gap-2">
                <input
                  placeholder="Concepto (ej. Cofre tipo plan)"
                  value={item.concepto}
                  onChange={(e) => actualizarItem(i, "concepto", e.target.value)}
                  className="rounded-lg border border-vino-100 px-2 py-1.5 text-sm"
                />
                <input
                  type="number" min={1} placeholder="Cant."
                  value={item.cantidad}
                  onChange={(e) => actualizarItem(i, "cantidad", e.target.value)}
                  className="rounded-lg border border-vino-100 px-2 py-1.5 text-sm"
                />
                <input
                  type="number" min={0} placeholder="Valor unit."
                  value={item.valorUnitario}
                  onChange={(e) => actualizarItem(i, "valorUnitario", e.target.value)}
                  className="rounded-lg border border-vino-100 px-2 py-1.5 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
                  className="text-tinta/40 hover:text-red-600"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setItems((prev) => [...prev, itemVacio()])}
              className="flex items-center gap-1.5 text-sm text-vino-700 hover:underline"
            >
              <Plus size={14} /> Agregar ítem
            </button>
            <p className="text-right text-sm font-medium text-vino-900">
              Total: ${totalServicio.toLocaleString("es-CO")}
            </p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={guardando}
            className="rounded-lg bg-vino-700 px-4 py-2 text-sm font-medium text-white hover:bg-vino-600 disabled:opacity-60"
          >
            {guardando ? "Guardando…" : "Guardar servicio"}
          </button>
        </form>
      )}

      <DataTable
        columnas={[
          { encabezado: "Fecha", render: (s: Servicio) => aFecha(s.fechaServicio) },
          { encabezado: "Fallecido", render: (s: Servicio) => s.fallecido.nombreCompleto },
          { encabezado: "Convenio", render: (s: Servicio) => s.convenioId },
          { encabezado: "Valor", render: (s: Servicio) => `$${s.valorTotal.toLocaleString("es-CO")}` },
          {
            encabezado: "Facturación",
            render: (s: Servicio) => (
              <span className={`rounded-full px-2.5 py-1 text-xs ${
                s.estadoFacturacion === "pagado" ? "bg-green-50 text-green-700"
                : s.estadoFacturacion === "facturado" ? "bg-blue-50 text-blue-700"
                : "bg-amber-50 text-amber-700"
              }`}>
                {s.estadoFacturacion}
              </span>
            ),
          },
        ]}
        filas={servicios}
        cargando={cargando}
        claveFila={(s) => s.id}
        vacioTitulo="Todavía no hay servicios registrados"
        vacioDescripcion='Usa "Nuevo servicio" para agregar el primero.'
      />
    </div>
  );
}