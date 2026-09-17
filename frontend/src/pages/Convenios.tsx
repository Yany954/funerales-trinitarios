import { useEffect, useMemo, useState, FormEvent } from "react";
import { collection, collectionGroup, onSnapshot, query } from "firebase/firestore";
import { Handshake, Pencil } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { db, crearConvenio, actualizarConvenio, guardarTarifa } from "../api/client";
import CampoPrecio from "../components/CampoPrecio";
import { formatoPesos } from "../utils/formato";
import type { Convenio, TarifaConvenio } from "../types";

const METRICAS: { valor: keyof TarifaConvenio; etiqueta: string }[] = [
  { valor: "servicioCompletoBasico", etiqueta: "Servicio completo básico" },
  { valor: "servicioCompletoSemilujo", etiqueta: "Servicio completo semilujo" },
  { valor: "servicioCompletoLujo", etiqueta: "Servicio completo lujo" },
  { valor: "iniciales", etiqueta: "Iniciales" },
  { valor: "finales", etiqueta: "Finales" },
  { valor: "trasladoLocal", etiqueta: "Traslado local" },
  { valor: "trasladoFluvial", etiqueta: "Traslado fluvial" },
];

const COLORES_POR_ANIO: Record<string, string> = { "2025": "#B14E72", "2026": "#5E2138" };

interface TarifaConId extends TarifaConvenio {
  convenioId: string;
}

export default function Convenios() {
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [tarifas, setTarifas] = useState<TarifaConId[]>([]);
  const [metrica, setMetrica] = useState<keyof TarifaConvenio>("servicioCompletoBasico");

  const [editandoConvenio, setEditandoConvenio] = useState<Convenio | null>(null);
  const [guardandoConvenio, setGuardandoConvenio] = useState(false);
  const [guardandoTarifa, setGuardandoTarifa] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selección actual del formulario de tarifa — controlada, para poder
  // "recargar" los valores existentes cuando eliges un convenio + año que
  // ya tiene tarifa guardada (así puedes corregir un precio sin adivinar).
  const [convenioIdTarifa, setConvenioIdTarifa] = useState("");
  const [anioTarifa, setAnioTarifa] = useState("");

  useEffect(() => {
    return onSnapshot(
      query(collection(db, "convenios")),
      (snap) => setConvenios(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Convenio))),
      (err) => console.error("Error cargando convenios:", err)
    );
  }, []);

  useEffect(() => {
    return onSnapshot(
      query(collectionGroup(db, "tarifas")),
      (snap) => setTarifas(snap.docs.map((d) => ({ ...(d.data() as TarifaConvenio), convenioId: d.ref.parent.parent!.id }))),
      (err) => console.error("Error cargando tarifas:", err)
    );
  }, []);

  const anios = useMemo(() => Array.from(new Set(tarifas.map((t) => t.anio))).sort(), [tarifas]);

  const datosGrafica = useMemo(() => {
    return convenios.map((c) => {
      const fila: Record<string, string | number> = { nombre: c.nombre };
      anios.forEach((anio) => {
        const tarifa = tarifas.find((t) => t.convenioId === c.id && t.anio === anio);
        fila[anio] = (tarifa?.[metrica] as number | undefined) ?? 0;
      });
      return fila;
    });
  }, [convenios, tarifas, anios, metrica]);

  // La tarifa existente para lo que hay seleccionado ahora mismo en el
  // formulario — si existe, se usa para precargar los CampoPrecio.
  const tarifaExistente = useMemo(
    () => tarifas.find((t) => t.convenioId === convenioIdTarifa && t.anio === anioTarifa) ?? null,
    [tarifas, convenioIdTarifa, anioTarifa]
  );

  async function manejarCrearConvenio(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setGuardandoConvenio(true);
    const form = new FormData(e.currentTarget);
    try {
      const datos = {
        nombre: String(form.get("nombre")),
        tipo: String(form.get("tipo")) as Convenio["tipo"],
        numeroContrato: String(form.get("numeroContrato") || "") || undefined,
        coberturaGeografica: String(form.get("coberturaGeografica") || "").split(",").map((s) => s.trim()).filter(Boolean),
      };
      if (editandoConvenio) {
        await actualizarConvenio({ id: editandoConvenio.id, ...datos });
      } else {
        await crearConvenio(datos);
      }
      setEditandoConvenio(null);
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el convenio.");
    } finally {
      setGuardandoConvenio(false);
    }
  }

  async function manejarGuardarTarifa(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setGuardandoTarifa(true);
    const form = new FormData(e.currentTarget);
    const numero = (campo: string) => Number(form.get(campo) || 0);
    try {
      await guardarTarifa({
        convenioId: convenioIdTarifa,
        anio: anioTarifa,
        servicioCompletoBasico: numero("servicioCompletoBasico"),
        servicioCompletoSemilujo: form.get("servicioCompletoSemilujo") ? numero("servicioCompletoSemilujo") : undefined,
        servicioCompletoLujo: form.get("servicioCompletoLujo") ? numero("servicioCompletoLujo") : undefined,
        iniciales: numero("iniciales"),
        finales: numero("finales"),
        trasladoLocal: numero("trasladoLocal"),
        trasladoFluvial: numero("trasladoFluvial"),
      });
      setConvenioIdTarifa("");
      setAnioTarifa("");
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la tarifa.");
    } finally {
      setGuardandoTarifa(false);
    }
  }

  // key único por combinación convenio+año+campo — fuerza que CampoPrecio
  // vuelva a tomar el valorInicial cuando cambias de convenio o de año.
  const claveTarifa = `${convenioIdTarifa}-${anioTarifa}`;

  return (
    <div className="space-y-8">
      {/* Gráfica */}
      <div className="rounded-xl border border-vino-100 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg text-vino-900">Precios por convenio</h2>
          <select value={metrica} onChange={(e) => setMetrica(e.target.value as keyof TarifaConvenio)} className="rounded-lg border border-vino-100 px-3 py-1.5 text-sm">
            {METRICAS.map((m) => <option key={m.valor} value={m.valor}>{m.etiqueta}</option>)}
          </select>
        </div>
        {datosGrafica.length === 0 ? (
          <p className="py-10 text-center text-sm text-tinta/50">Crea al menos un convenio con una tarifa para ver la gráfica.</p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={datosGrafica}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="nombre" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: any) => formatoPesos(Number(value))} />
              <Legend />
              {anios.map((anio) => <Bar key={anio} dataKey={anio} fill={COLORES_POR_ANIO[anio] ?? "#B14E72"} radius={[4, 4, 0, 0]} />)}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Lista de convenios, con editar */}
      <div className="space-y-3">
        <h3 className="font-display text-base text-vino-900">Convenios</h3>
        <div className="divide-y divide-vino-50 rounded-xl border border-vino-100 bg-white">
          {convenios.map((c) => (
            <div key={c.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <p className="font-medium text-vino-900">{c.nombre}</p>
                <p className="text-xs text-tinta/50">
                  {c.tipo === "alcaldia" ? "Alcaldía" : c.tipo === "empresa_exequial" ? "Empresa exequial" : "Interno"}
                  {c.numeroContrato ? ` · contrato ${c.numeroContrato}` : ""}
                  {c.coberturaGeografica?.length ? ` · ${c.coberturaGeografica.join(", ")}` : ""}
                </p>
              </div>
              <button onClick={() => setEditandoConvenio(c)} className="text-vino-700 hover:underline"><Pencil size={14} /></button>
            </div>
          ))}
          {convenios.length === 0 && <p className="px-4 py-6 text-center text-sm text-tinta/50">Todavía no hay convenios.</p>}
        </div>
      </div>

      {/* Crear/editar convenio */}
      <div className="space-y-3 rounded-xl border border-vino-100 bg-white p-4">
        <h3 className="font-display text-base text-vino-900">{editandoConvenio ? `Editando: ${editandoConvenio.nombre}` : "Nuevo convenio"}</h3>
        <form onSubmit={manejarCrearConvenio} className="grid gap-3 sm:grid-cols-2">
          <input name="nombre" required defaultValue={editandoConvenio?.nombre} placeholder="Nombre (ej. Recordar)" className="rounded-lg border border-vino-100 px-3 py-2 text-sm" />
          <select name="tipo" required defaultValue={editandoConvenio?.tipo} className="rounded-lg border border-vino-100 px-3 py-2 text-sm">
            <option value="">Tipo…</option>
            <option value="empresa_exequial">Empresa exequial</option>
            <option value="alcaldia">Alcaldía</option>
            <option value="interno">Interno (afiliados/particular)</option>
          </select>
          <input name="numeroContrato" defaultValue={editandoConvenio?.numeroContrato} placeholder="N° de contrato (solo alcaldías)" className="rounded-lg border border-vino-100 px-3 py-2 text-sm" />
          <input name="coberturaGeografica" defaultValue={editandoConvenio?.coberturaGeografica?.join(", ")} placeholder="Municipios que cubre, separados por coma" className="rounded-lg border border-vino-100 px-3 py-2 text-sm" />
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" disabled={guardandoConvenio} className="rounded-lg bg-vino-700 px-4 py-2 text-sm font-medium text-white hover:bg-vino-600 disabled:opacity-60">
              {guardandoConvenio ? "Guardando…" : editandoConvenio ? "Guardar cambios" : "Crear convenio"}
            </button>
            {editandoConvenio && (
              <button type="button" onClick={() => setEditandoConvenio(null)} className="rounded-lg border border-vino-100 px-4 py-2 text-sm text-tinta/60">Cancelar</button>
            )}
          </div>
        </form>
      </div>
      {/* Lista de tarifas ya guardadas, para poder editarlas con un clic */}
      <div className="space-y-3">
        <h3 className="font-display text-base text-vino-900">Tarifas registradas</h3>
        <div className="divide-y divide-vino-50 rounded-xl border border-vino-100 bg-white">
          {tarifas
            .slice()
            .sort((a, b) => (a.convenioId + a.anio).localeCompare(b.convenioId + b.anio))
            .map((t) => (
              <div key={`${t.convenioId}-${t.anio}`} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-vino-900">
                    {convenios.find((c) => c.id === t.convenioId)?.nombre ?? t.convenioId} — {t.anio}
                  </p>
                  <p className="text-xs text-tinta/50">
                    Básico: {formatoPesos(t.servicioCompletoBasico)}
                    {t.servicioCompletoSemilujo ? ` · Semilujo: ${formatoPesos(t.servicioCompletoSemilujo)}` : ""}
                    {t.servicioCompletoLujo ? ` · Lujo: ${formatoPesos(t.servicioCompletoLujo)}` : ""}
                  </p>
                </div>
                <button
                  onClick={() => { setConvenioIdTarifa(t.convenioId); setAnioTarifa(t.anio); }}
                  className="text-vino-700 hover:underline"
                >
                  <Pencil size={14} />
                </button>
              </div>
            ))}
          {tarifas.length === 0 && <p className="px-4 py-6 text-center text-sm text-tinta/50">Todavía no hay tarifas guardadas.</p>}
        </div>
      </div>

      {/* Tarifa por año — crea una nueva, o corrige una existente */}
      <div className="space-y-3 rounded-xl border border-vino-100 bg-white p-4">
        <h3 className="font-display text-base text-vino-900">Tarifa por año</h3>
        {tarifaExistente && (
          <p className="rounded-lg bg-vino-50 px-3 py-2 text-xs text-vino-700">
            Ya existe una tarifa {anioTarifa} para este convenio — los valores de abajo son los que tiene guardados. Corrígelos y guarda para actualizarla.
          </p>
        )}
        <form key={claveTarifa} onSubmit={manejarGuardarTarifa} className="grid gap-3 sm:grid-cols-2">
          <select value={convenioIdTarifa} onChange={(e) => setConvenioIdTarifa(e.target.value)} required className="rounded-lg border border-vino-100 px-3 py-2 text-sm sm:col-span-2">
            <option value="">Convenio…</option>
            {convenios.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <input value={anioTarifa} onChange={(e) => setAnioTarifa(e.target.value)} required placeholder="Año (ej. 2026)" className="rounded-lg border border-vino-100 px-3 py-2 text-sm" />
          <div />
          <CampoPrecio name="servicioCompletoBasico" placeholder="Servicio completo básico" valorInicial={tarifaExistente?.servicioCompletoBasico} required />
          <CampoPrecio name="servicioCompletoSemilujo" placeholder="Semilujo (opcional)" valorInicial={tarifaExistente?.servicioCompletoSemilujo} />
          <CampoPrecio name="servicioCompletoLujo" placeholder="Lujo (opcional)" valorInicial={tarifaExistente?.servicioCompletoLujo} />
          <CampoPrecio name="iniciales" placeholder="Iniciales" valorInicial={tarifaExistente?.iniciales} required />
          <CampoPrecio name="finales" placeholder="Finales" valorInicial={tarifaExistente?.finales} required />
          <CampoPrecio name="trasladoLocal" placeholder="Traslado local" valorInicial={tarifaExistente?.trasladoLocal} required />
          <CampoPrecio name="trasladoFluvial" placeholder="Traslado fluvial" valorInicial={tarifaExistente?.trasladoFluvial} required />
          {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
          <button type="submit" disabled={guardandoTarifa} className="flex items-center justify-center gap-2 rounded-lg bg-buganvilla px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60 sm:col-span-2">
            <Handshake size={16} />
            {guardandoTarifa ? "Guardando…" : tarifaExistente ? "Actualizar tarifa" : "Guardar tarifa"}
          </button>
        </form>
      </div>
    </div>
  );
}