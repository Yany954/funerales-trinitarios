import { useEffect, useMemo, useState, FormEvent } from "react";
import { collection, collectionGroup, onSnapshot, query } from "firebase/firestore";
import { CreditCard, Pencil } from "lucide-react";
import { db, crearPlan, actualizarPlan, guardarPrecioAnioPlan } from "../api/client";
import CampoPrecio from "../components/CampoPrecio";
import { formatoPesos } from "../utils/formato";
import type { PlanFunerario, HistorialPrecioPlan } from "../types";

export default function Planes() {
  const [planes, setPlanes] = useState<PlanFunerario[]>([]);
  const [historial, setHistorial] = useState<HistorialPrecioPlan[]>([]);
  const [cargando, setCargando] = useState(true);

  const [editandoPlan, setEditandoPlan] = useState<PlanFunerario | null>(null);
  const [guardandoPlan, setGuardandoPlan] = useState(false);

  const [planIdPrecio, setPlanIdPrecio] = useState("");
  const [anioPrecio, setAnioPrecio] = useState("");
  const [guardandoPrecio, setGuardandoPrecio] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return onSnapshot(
      query(collection(db, "planes_funerarios")),
      (snap) => { setPlanes(snap.docs.map((d) => ({ id: d.id, ...d.data() } as PlanFunerario))); setCargando(false); },
      (err) => console.error("Error cargando planes:", err)
    );
  }, []);

  useEffect(() => {
    return onSnapshot(
      query(collectionGroup(db, "historial")),
      (snap) => setHistorial(snap.docs.map((d) => ({ ...(d.data() as HistorialPrecioPlan), planId: d.ref.parent.parent!.id }))),
      (err) => console.error("Error cargando historial de precios:", err)
    );
  }, []);

  const precioExistente = useMemo(
    () => historial.find((h) => h.planId === planIdPrecio && h.anio === anioPrecio) ?? null,
    [historial, planIdPrecio, anioPrecio]
  );

  async function manejarCrearOEditarPlan(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setGuardandoPlan(true);
    const form = new FormData(e.currentTarget);
    try {
      const nombre = String(form.get("nombre"));
      if (editandoPlan) {
        await actualizarPlan({ id: editandoPlan.id, nombre });
      } else {
        await crearPlan({ nombre, valorMensual: 0 }); // el precio real se carga abajo, en "Precio por año"
      }
      setEditandoPlan(null);
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el plan.");
    } finally {
      setGuardandoPlan(false);
    }
  }

  async function manejarGuardarPrecio(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setGuardandoPrecio(true);
    const form = new FormData(e.currentTarget);
    try {
      await guardarPrecioAnioPlan({
        planId: planIdPrecio,
        anio: anioPrecio,
        valorMensual: Number(form.get("valorMensual")),
      });
      setPlanIdPrecio("");
      setAnioPrecio("");
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el precio.");
    } finally {
      setGuardandoPrecio(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h3 className="font-display text-base text-vino-900">Planes</h3>
        <div className="divide-y divide-vino-50 rounded-xl border border-vino-100 bg-white">
          {cargando && <p className="px-4 py-6 text-center text-sm text-tinta/50">Cargando…</p>}
          {!cargando && planes.map((p) => (
            <div key={p.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <p className="font-medium text-vino-900">{p.nombre}</p>
                <p className="text-xs text-tinta/50">Mensualidad vigente: {formatoPesos(p.valorMensual)}</p>
              </div>
              <button onClick={() => setEditandoPlan(p)} className="text-vino-700 hover:underline"><Pencil size={14} /></button>
            </div>
          ))}
          {!cargando && planes.length === 0 && <p className="px-4 py-6 text-center text-sm text-tinta/50">Todavía no hay planes.</p>}
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-vino-100 bg-white p-4">
        <h3 className="font-display text-base text-vino-900">{editandoPlan ? `Editando: ${editandoPlan.nombre}` : "Nuevo plan"}</h3>
        <form onSubmit={manejarCrearOEditarPlan} className="flex gap-2">
          <input name="nombre" required defaultValue={editandoPlan?.nombre} placeholder="Nombre (ej. Girasol)" className="flex-1 rounded-lg border border-vino-100 px-3 py-2 text-sm" />
          <button type="submit" disabled={guardandoPlan} className="rounded-lg bg-vino-700 px-4 py-2 text-sm font-medium text-white hover:bg-vino-600 disabled:opacity-60">
            {guardandoPlan ? "Guardando…" : editandoPlan ? "Guardar cambios" : "Crear plan"}
          </button>
          {editandoPlan && (
            <button type="button" onClick={() => setEditandoPlan(null)} className="rounded-lg border border-vino-100 px-4 py-2 text-sm text-tinta/60">Cancelar</button>
          )}
        </form>
        {!editandoPlan && <p className="text-xs text-tinta/50">El precio se carga aparte, abajo en "Precio por año" — un plan nuevo empieza sin mensualidad hasta que le asignes una.</p>}
      </div>

      <div className="space-y-3">
        <h3 className="font-display text-base text-vino-900">Historial de precios</h3>
        <div className="divide-y divide-vino-50 rounded-xl border border-vino-100 bg-white">
          {historial
            .slice()
            .sort((a, b) => (a.planId + a.anio).localeCompare(b.planId + b.anio))
            .map((h) => (
              <div key={`${h.planId}-${h.anio}`} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-vino-900">{planes.find((p) => p.id === h.planId)?.nombre ?? h.planId} — {h.anio}</p>
                  <p className="text-xs text-tinta/50">{formatoPesos(h.valorMensual)}/mes</p>
                </div>
                <button onClick={() => { setPlanIdPrecio(h.planId); setAnioPrecio(h.anio); }} className="text-vino-700 hover:underline"><Pencil size={14} /></button>
              </div>
            ))}
          {historial.length === 0 && <p className="px-4 py-6 text-center text-sm text-tinta/50">Todavía no hay precios registrados.</p>}
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-vino-100 bg-white p-4">
        <h3 className="font-display text-base text-vino-900">Precio por año</h3>
        {precioExistente && (
          <p className="rounded-lg bg-vino-50 px-3 py-2 text-xs text-vino-700">
            Ya existe un precio {anioPrecio} para este plan — corrígelo y guarda para actualizarlo.
          </p>
        )}
        <form key={`${planIdPrecio}-${anioPrecio}`} onSubmit={manejarGuardarPrecio} className="grid gap-3 sm:grid-cols-3">
          <select value={planIdPrecio} onChange={(e) => setPlanIdPrecio(e.target.value)} required className="rounded-lg border border-vino-100 px-3 py-2 text-sm">
            <option value="">Plan…</option>
            {planes.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
          <input value={anioPrecio} onChange={(e) => setAnioPrecio(e.target.value)} required placeholder="Año (ej. 2026)" className="rounded-lg border border-vino-100 px-3 py-2 text-sm" />
          <CampoPrecio name="valorMensual" required placeholder="Mensualidad" valorInicial={precioExistente?.valorMensual} />
          {error && <p className="text-sm text-red-600 sm:col-span-3">{error}</p>}
          <button type="submit" disabled={guardandoPrecio} className="flex items-center justify-center gap-2 rounded-lg bg-buganvilla px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60 sm:col-span-3">
            <CreditCard size={16} />
            {guardandoPrecio ? "Guardando…" : precioExistente ? "Actualizar precio" : "Guardar precio"}
          </button>
        </form>
      </div>
    </div>
  );
}