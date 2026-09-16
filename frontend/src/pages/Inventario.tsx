import { useEffect, useState, FormEvent } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { Warehouse } from "lucide-react";
import { db, actualizarInventario } from "../api/client";
import DataTable from "../components/DataTable";
import { useRol } from "../auth/RolContext";
import type { InventarioCofre, TipoCofre } from "../types";


export default function Inventario() {
  const { rol, sedeAsignada, sedeSeleccionada, cargando: cargandoRol } = useRol();
if (cargandoRol) return <div className="py-16 text-center text-tinta/50">Cargando…</div>;
  const sedeActiva = rol === "admin" ? (sedeSeleccionada === "all" ? "Pailitas" : sedeSeleccionada) : sedeAsignada;

  const [cofres, setCofres] = useState<TipoCofre[]>([]);
  const [inventario, setInventario] = useState<InventarioCofre[]>([]);
  const [cargando, setCargando] = useState(true);
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
    return onSnapshot(query(collection(db, "inventario_cofres"), where("sede", "==", sedeActiva)), (snap) => {
      setInventario(snap.docs.map((d) => ({ id: d.id, ...d.data() } as InventarioCofre)));
      setCargando(false);
    }, (err) => console.error("Error en la consulta:", err));
  }, [sedeActiva]);

  async function manejarActualizar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!sedeActiva) return;
    setError(null);
    setGuardando(true);
    const form = new FormData(e.currentTarget);
    try {
      await actualizarInventario({
        sede: sedeActiva,
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg text-vino-900">Inventario — {sedeActiva}</h2>
        {rol === "admin" && sedeSeleccionada === "all" && (
          <p className="text-sm text-amber-700">
            Elige una sede específica arriba para editar inventario (no se puede editar en "Todas las sedes").
          </p>
        )}
      </div>

      <form onSubmit={manejarActualizar} className="grid gap-3 rounded-xl border border-vino-100 bg-white p-4 sm:grid-cols-3">
        <select name="tipoCofreId" required className="rounded-lg border border-vino-100 px-3 py-2 text-sm sm:col-span-2">
          <option value="">Tipo de cofre…</option>
          {cofres.map((c) => <option key={c.id} value={c.id}>{c.referencia} ({c.nivel})</option>)}
        </select>
        <input name="cantidadDisponible" type="number" min={0} required placeholder="Cantidad" className="rounded-lg border border-vino-100 px-3 py-2 text-sm" />
        {error && <p className="text-sm text-red-600 sm:col-span-3">{error}</p>}
        <button
          type="submit"
          disabled={guardando}
          className="sm:col-span-3 flex items-center justify-center gap-2 rounded-lg bg-buganvilla px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          <Warehouse size={16} />
          {guardando ? "Guardando…" : "Actualizar cantidad"}
        </button>
      </form>

      <DataTable
        columnas={[
          { encabezado: "Cofre", render: (i: InventarioCofre) => cofres.find((c) => c.id === i.tipoCofreId)?.referencia ?? i.tipoCofreId },
          { encabezado: "Disponibles", render: (i: InventarioCofre) => i.cantidadDisponible },
        ]}
        filas={inventario}
        cargando={cargando}
        claveFila={(i) => i.id}
        vacioTitulo="Todavía no hay inventario cargado en esta sede"
        vacioDescripcion="Usa el formulario de arriba para registrar la primera cantidad."
      />
    </div>
  );
}