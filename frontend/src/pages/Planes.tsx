import { useEffect, useState, FormEvent } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { CreditCard } from "lucide-react";
import { db, crearPlan } from "../api/client";
import DataTable from "../components/DataTable";
import type { PlanFunerario } from "../types";
import { formatoPesos } from "../utils/formato";

export default function Planes() {
  const [planes, setPlanes] = useState<PlanFunerario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, "planes_funerarios")), (snap) => {
      setPlanes(snap.docs.map((d) => ({ id: d.id, ...d.data() } as PlanFunerario)));
      setCargando(false);
    },(err) => console.error("Error en la consulta:", err));
    return unsub;
  }, []);

  async function manejarCrear(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    const form = new FormData(e.currentTarget);
    try {
      await crearPlan({
        nombre: String(form.get("nombre")),
        valorMensual: Number(form.get("valorMensual")),
      });
      setMostrarFormulario(false);
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el plan.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg text-vino-900">Planes funerarios</h2>
        <button
          onClick={() => setMostrarFormulario((v) => !v)}
          className="flex items-center gap-2 rounded-lg bg-buganvilla px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
        >
          <CreditCard size={16} />
          Nuevo plan
        </button>
      </div>

      {mostrarFormulario && (
        <form onSubmit={manejarCrear} className="grid gap-3 rounded-xl border border-vino-100 bg-white p-4 sm:grid-cols-2">
          <input name="nombre" required placeholder="Nombre (ej. Girasol)" className="rounded-lg border border-vino-100 px-3 py-2 text-sm" />
          <input name="valorMensual" type="number" required placeholder="Valor mensual" className="rounded-lg border border-vino-100 px-3 py-2 text-sm" />
          {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
          <button
            type="submit"
            disabled={guardando}
            className="sm:col-span-2 rounded-lg bg-vino-700 px-4 py-2 text-sm font-medium text-white hover:bg-vino-600 disabled:opacity-60"
          >
            {guardando ? "Guardando…" : "Guardar plan"}
          </button>
        </form>
      )}

      <DataTable
        columnas={[
          { encabezado: "Nombre", render: (p: PlanFunerario) => p.nombre },
          { encabezado: "Mensualidad", render: (p: PlanFunerario) => formatoPesos(p.valorMensual) },
        ]}
        filas={planes}
        cargando={cargando}
        claveFila={(p) => p.id}
        vacioTitulo="Todavía no hay planes creados"
        vacioDescripcion='Usa "Nuevo plan" para agregar el primero (ej. Girasol, Alianza, Bendiciones, Integral).'
      />
    </div>
  );
}