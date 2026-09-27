import { useEffect, useState, FormEvent } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { Warehouse } from "lucide-react";
import { db, actualizarInventario } from "../api/client";
import DataTable from "../components/DataTable";
import { useRol } from "../auth/RolContext";
import type { InventarioCofre, TipoCofre } from "../types";

const SEDES = ["Pailitas", "Tamalameque", "Pelaya", "Curumaní"] as const;
interface FilaInventarioAgrupada {
  tipoCofreId: string;
  cantidadDisponible: number;
  sedes: string[];
}
export default function Inventario() {
  const { rol, sedeAsignada, sedeSeleccionada, cargando: cargandoRol } = useRol();
  const sedeActiva = rol === "admin" ? sedeSeleccionada : sedeAsignada;

  const [cofres, setCofres] = useState<TipoCofre[]>([]);
  const [inventario, setInventario] = useState<InventarioCofre[]>([]);
  const [cargando, setCargando] = useState(true);
  const [sedeFormulario, setSedeFormulario] = useState<string>(""); // sede a la que se le va a actualizar cantidad
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return onSnapshot(query(collection(db, "tipos_cofre")), (snap) =>
      setCofres(snap.docs.map((d) => ({ id: d.id, ...d.data() } as TipoCofre)))
    );
  }, []);

  useEffect(() => {
    if (!sedeActiva) return;
    setCargando(true);
    const base = collection(db, "inventario_cofres");
    const q = sedeActiva === "all" ? query(base) : query(base, where("sede", "==", sedeActiva));
    return onSnapshot(q, (snap) => {
      setInventario(snap.docs.map((d) => ({ id: d.id, ...d.data() } as InventarioCofre)));
      setCargando(false);
    });
  }, [sedeActiva]);

  if (cargandoRol) return <div className="py-16 text-center text-tinta/50">Cargando…</div>;

  async function manejarActualizar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const sedeDestino = rol === "admin" ? sedeFormulario : sedeAsignada;
    if (!sedeDestino) return;
    setError(null);
    setGuardando(true);
    const form = new FormData(e.currentTarget);
    try {
      await actualizarInventario({
        sede: sedeDestino,
        tipoCofreId: String(form.get("tipoCofreId")),
        cantidadDisponible: Number(form.get("cantidadDisponible")),
      });
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el inventario.");
    } finally {
      setGuardando(false);
    }
  }

  // Cuando está en "todas las sedes", junta las cantidades del mismo tipo de
  // cofre venidas de sedes distintas en una sola fila con el total.
  const filasTabla: (InventarioCofre | FilaInventarioAgrupada)[] = sedeActiva === "all"
    ? Object.values(
      inventario.reduce<Record<string, { tipoCofreId: string; cantidadDisponible: number; sedes: string[] }>>((acc, i) => {
        if (!acc[i.tipoCofreId]) acc[i.tipoCofreId] = { tipoCofreId: i.tipoCofreId, cantidadDisponible: 0, sedes: [] };
        acc[i.tipoCofreId].cantidadDisponible += i.cantidadDisponible;
        acc[i.tipoCofreId].sedes.push(`${i.sede}: ${i.cantidadDisponible}`);
        return acc;
      }, {})
    )
    : inventario;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg text-vino-900">
          Inventario — {sedeActiva === "all" ? "Resumen de todas las sedes" : sedeActiva}
        </h2>
      </div>

      <form onSubmit={manejarActualizar} className="grid gap-3 rounded-xl border border-vino-100 bg-white p-4 sm:grid-cols-4">
        {rol === "admin" && (
          <select value={sedeFormulario} onChange={(e) => setSedeFormulario(e.target.value)} required className="rounded-lg border border-vino-100 px-3 py-2 text-sm">
            <option value="">Sede a actualizar…</option>
            {SEDES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
        <select name="tipoCofreId" required className={`rounded-lg border border-vino-100 px-3 py-2 text-sm ${rol === "admin" ? "sm:col-span-2" : "sm:col-span-3"}`}>
          <option value="">Tipo de cofre…</option>
          {cofres.map((c) => <option key={c.id} value={c.id}>{c.referencia}</option>)}
        </select>
        <input name="cantidadDisponible" type="number" min={0} required placeholder="Cantidad" className="rounded-lg border border-vino-100 px-3 py-2 text-sm" />
        {error && <p className="text-sm text-red-600 sm:col-span-4">{error}</p>}
        <button type="submit" disabled={guardando} className="flex items-center justify-center gap-2 rounded-lg bg-buganvilla px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60 sm:col-span-4">
          <Warehouse size={16} />
          {guardando ? "Guardando…" : "Actualizar cantidad"}
        </button>
      </form>
      {sedeActiva === "all" && (
        <p className="text-xs text-amber-700">
          Estás viendo el resumen de todas las sedes — para actualizar una cantidad, elige primero la sede específica arriba en el formulario.
        </p>
      )}

      {sedeActiva === "all" ? (
        <DataTable<FilaInventarioAgrupada>
          columnas={[
            { encabezado: "Cofre", render: (i) => cofres.find((c) => c.id === i.tipoCofreId)?.referencia ?? i.tipoCofreId },
            { encabezado: "Total (todas las sedes)", render: (i) => i.cantidadDisponible },
            { encabezado: "Desglose", render: (i) => i.sedes.join(" · ") },
          ]}
          filas={filasTabla as FilaInventarioAgrupada[]}
          cargando={cargando}
          claveFila={(i) => i.tipoCofreId}
          vacioTitulo="Todavía no hay inventario cargado"
          vacioDescripcion="Usa el formulario de arriba para registrar la primera cantidad."
        />
      ) : (
        <DataTable<InventarioCofre>
          columnas={[
            { encabezado: "Cofre", render: (i) => cofres.find((c) => c.id === i.tipoCofreId)?.referencia ?? i.tipoCofreId },
            { encabezado: "Disponibles", render: (i) => i.cantidadDisponible },
          ]}
          filas={filasTabla as InventarioCofre[]}
          cargando={cargando}
          claveFila={(i) => i.id}
          vacioTitulo="Todavía no hay inventario cargado"
          vacioDescripcion="Usa el formulario de arriba para registrar la primera cantidad."
        />
      )}
    </div>
  );
}