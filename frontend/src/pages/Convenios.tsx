import { useEffect, useMemo, useState, FormEvent } from "react";
import { collection, collectionGroup, onSnapshot, query } from "firebase/firestore";
import { Handshake } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { formatoPesos } from "../utils/formato";
import { db, crearConvenio, guardarTarifa } from "../api/client";
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

const COLORES_POR_ANIO: Record<string, string> = {
  "2025": "#B14E72",
  "2026": "#5E2138",
};

interface TarifaConId extends TarifaConvenio {
  convenioId: string;
}

export default function Convenios() {
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [tarifas, setTarifas] = useState<TarifaConId[]>([]);
  const [metrica, setMetrica] = useState<keyof TarifaConvenio>("servicioCompletoBasico");

  const [guardandoConvenio, setGuardandoConvenio] = useState(false);
  const [guardandoTarifa, setGuardandoTarifa] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, "convenios")), (snap) => {
      setConvenios(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Convenio)));
    }, (err) => console.error("Error en la consulta:", err));
    return unsub;
  }, []);

  useEffect(() => {
    // collectionGroup: trae TODAS las subcolecciones "tarifas" de todos los convenios en una sola consulta.
    const unsub = onSnapshot(query(collectionGroup(db, "tarifas")), (snap) => {
      setTarifas(
        snap.docs.map((d) => ({
          ...(d.data() as TarifaConvenio),
          convenioId: d.ref.parent.parent!.id,
        }))
      );
    });
    return unsub;
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

  async function manejarCrearConvenio(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setGuardandoConvenio(true);
    const form = new FormData(e.currentTarget);
    try {
      await crearConvenio({
        nombre: String(form.get("nombre")),
        tipo: String(form.get("tipo")) as Convenio["tipo"],
        numeroContrato: String(form.get("numeroContrato") || "") || undefined,
        coberturaGeografica: String(form.get("coberturaGeografica") || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      });
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el convenio.");
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
        convenioId: String(form.get("convenioId")),
        anio: String(form.get("anio")),
        servicioCompletoBasico: numero("servicioCompletoBasico"),
        servicioCompletoSemilujo: form.get("servicioCompletoSemilujo") ? numero("servicioCompletoSemilujo") : undefined,
        servicioCompletoLujo: form.get("servicioCompletoLujo") ? numero("servicioCompletoLujo") : undefined,
        iniciales: numero("iniciales"),
        finales: numero("finales"),
        trasladoLocal: numero("trasladoLocal"),
        trasladoFluvial: numero("trasladoFluvial"),
      });
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la tarifa.");
    } finally {
      setGuardandoTarifa(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Gráfica: crecimiento de precios por convenio, comparando años */}
      <div className="rounded-xl border border-vino-100 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg text-vino-900">Precios por convenio</h2>
          <select
            value={metrica}
            onChange={(e) => setMetrica(e.target.value as keyof TarifaConvenio)}
            className="rounded-lg border border-vino-100 px-3 py-1.5 text-sm"
          >
            {METRICAS.map((m) => (
              <option key={m.valor} value={m.valor}>{m.etiqueta}</option>
            ))}
          </select>
        </div>
        {datosGrafica.length === 0 ? (
          <p className="py-10 text-center text-sm text-tinta/50">
            Crea al menos un convenio con una tarifa para ver la gráfica.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={datosGrafica}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="nombre" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: any) => formatoPesos(Number(value))} />
              <Legend />
              {anios.map((anio) => (
                <Bar key={anio} dataKey={anio} fill={COLORES_POR_ANIO[anio] ?? "#B14E72"} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Nuevo convenio */}
      <div className="space-y-3 rounded-xl border border-vino-100 bg-white p-4">
        <h3 className="font-display text-base text-vino-900">Nuevo convenio</h3>
        <form onSubmit={manejarCrearConvenio} className="grid gap-3 sm:grid-cols-2">
          <input name="nombre" required placeholder="Nombre (ej. Recordar)" className="rounded-lg border border-vino-100 px-3 py-2 text-sm" />
          <select name="tipo" required className="rounded-lg border border-vino-100 px-3 py-2 text-sm">
            <option value="">Tipo…</option>
            <option value="empresa_exequial">Empresa exequial</option>
            <option value="alcaldia">Alcaldía</option>
            <option value="interno">Interno (afiliados/particular)</option>
          </select>
          <input name="numeroContrato" placeholder="N° de contrato (solo alcaldías)" className="rounded-lg border border-vino-100 px-3 py-2 text-sm" />
          <input name="coberturaGeografica" placeholder="Municipios que cubre, separados por coma" className="rounded-lg border border-vino-100 px-3 py-2 text-sm" />
          <button
            type="submit"
            disabled={guardandoConvenio}
            className="sm:col-span-2 rounded-lg bg-vino-700 px-4 py-2 text-sm font-medium text-white hover:bg-vino-600 disabled:opacity-60"
          >
            {guardandoConvenio ? "Guardando…" : "Crear convenio"}
          </button>
        </form>
      </div>

      {/* Tarifa por año */}
      <div className="space-y-3 rounded-xl border border-vino-100 bg-white p-4">
        <h3 className="font-display text-base text-vino-900">Tarifa por año</h3>
        <form onSubmit={manejarGuardarTarifa} className="grid gap-3 sm:grid-cols-2">
          <select name="convenioId" required className="rounded-lg border border-vino-100 px-3 py-2 text-sm sm:col-span-2">
            <option value="">Convenio…</option>
            {convenios.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <input name="anio" required placeholder="Año (ej. 2026)" className="rounded-lg border border-vino-100 px-3 py-2 text-sm" />
          <input name="servicioCompletoBasico" type="number" required placeholder="Servicio completo básico" className="rounded-lg border border-vino-100 px-3 py-2 text-sm" />
          <input name="servicioCompletoSemilujo" type="number" placeholder="Semilujo (opcional)" className="rounded-lg border border-vino-100 px-3 py-2 text-sm" />
          <input name="servicioCompletoLujo" type="number" placeholder="Lujo (opcional)" className="rounded-lg border border-vino-100 px-3 py-2 text-sm" />
          <input name="iniciales" type="number" required placeholder="Iniciales" className="rounded-lg border border-vino-100 px-3 py-2 text-sm" />
          <input name="finales" type="number" required placeholder="Finales" className="rounded-lg border border-vino-100 px-3 py-2 text-sm" />
          <input name="trasladoLocal" type="number" required placeholder="Traslado local" className="rounded-lg border border-vino-100 px-3 py-2 text-sm" />
          <input name="trasladoFluvial" type="number" required placeholder="Traslado fluvial" className="rounded-lg border border-vino-100 px-3 py-2 text-sm" />
          {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
          <button
            type="submit"
            disabled={guardandoTarifa}
            className="sm:col-span-2 flex items-center justify-center gap-2 rounded-lg bg-buganvilla px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            <Handshake size={16} />
            {guardandoTarifa ? "Guardando…" : "Guardar tarifa"}
          </button>
        </form>
      </div>
    </div>
  );
}