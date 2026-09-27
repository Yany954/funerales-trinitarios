import { useEffect, useMemo, useState, FormEvent } from "react";
import { collection, collectionGroup, onSnapshot, query } from "firebase/firestore";
import { Handshake, Pencil, Copy } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { db, guardarTarifa, duplicarTarifa } from "../api/client";
import CampoPrecio from "../components/CampoPrecio";
import ModalEditarConvenio from "../components/ModalEditarConvenio";
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
  { valor: "precioCofre", etiqueta: "Precio cofre" },
  { valor: "precioBoveda", etiqueta: "Precio bóveda" },
];

const COLORES_POR_ANIO: Record<string, string> = { "2025": "#B14E72", "2026": "#5E2138" };

interface TarifaConId extends TarifaConvenio {
  convenioId: string;
}

export default function Convenios() {
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [tarifas, setTarifas] = useState<TarifaConId[]>([]);
  const [metrica, setMetrica] = useState<keyof TarifaConvenio>("servicioCompletoBasico");

  const [modalConvenio, setModalConvenio] = useState<{ abierto: boolean; convenio: Convenio | null }>({ abierto: false, convenio: null });
  const [guardandoTarifa, setGuardandoTarifa] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selección "de control" del formulario de tarifa — separado de lo que se
  // escribe dentro del form, para no romper el foco al teclear el año.
  const [convenioIdTarifa, setConvenioIdTarifa] = useState("");
  const [anioTarifa, setAnioTarifa] = useState("");

  // Valores que van DENTRO del formulario, controlados aparte. Se
  // sobreescriben solo cuando eliges una tarifa existente de la lista —
  // nunca mientras el usuario está escribiendo.
  const [valoresForm, setValoresForm] = useState<Partial<TarifaConvenio>>({});

  const [mostrarDuplicar, setMostrarDuplicar] = useState(false);
  const [anioDestinoDuplicar, setAnioDestinoDuplicar] = useState("");
  const [duplicando, setDuplicando] = useState(false);

  useEffect(() => {
    return onSnapshot(query(collection(db, "convenios")), (snap) => setConvenios(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Convenio))), (err) => console.error("Error cargando convenios:", err));
  }, []);

  useEffect(() => {
    return onSnapshot(query(collectionGroup(db, "tarifas")), (snap) => setTarifas(snap.docs.map((d) => ({ ...(d.data() as TarifaConvenio), convenioId: d.ref.parent.parent!.id }))), (err) => console.error("Error cargando tarifas:", err));
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

  const tarifaExistente = useMemo(
    () => tarifas.find((t) => t.convenioId === convenioIdTarifa && t.anio === anioTarifa) ?? null,
    [tarifas, convenioIdTarifa, anioTarifa]
  );

  // Elegir una tarifa de la lista SÍ debe precargar sus valores — esto es
  // deliberado y no rompe el foco porque no toca la `key` del formulario.
  function elegirTarifaExistente(convenioId: string, anio: string) {
    setConvenioIdTarifa(convenioId);
    setAnioTarifa(anio);
    const t = tarifas.find((x) => x.convenioId === convenioId && x.anio === anio);
    setValoresForm(t ?? {});
  }

  function nuevaTarifaEnBlanco() {
    setConvenioIdTarifa("");
    setAnioTarifa("");
    setValoresForm({});
  }

  async function manejarGuardarTarifa(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setGuardandoTarifa(true);
    const form = new FormData(e.currentTarget);
    const numero = (campo: string) => (form.get(campo) ? Number(form.get(campo)) : undefined);
    try {
      await guardarTarifa({
        convenioId: convenioIdTarifa,
        anio: anioTarifa,
        servicioCompletoBasico: numero("servicioCompletoBasico"),
        servicioCompletoSemilujo: numero("servicioCompletoSemilujo"),
        servicioCompletoLujo: numero("servicioCompletoLujo"),
        iniciales: numero("iniciales"),
        finales: numero("finales"),
        trasladoLocal: numero("trasladoLocal"),
        trasladoFluvial: numero("trasladoFluvial"),
        precioCofre: numero("precioCofre"),
        precioBoveda: numero("precioBoveda"),
      });
      nuevaTarifaEnBlanco();
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la tarifa.");
    } finally {
      setGuardandoTarifa(false);
    }
  }

  async function manejarDuplicar() {
    if (!convenioIdTarifa || !anioTarifa || !anioDestinoDuplicar) return;
    setError(null);
    setDuplicando(true);
    try {
      await duplicarTarifa({ convenioId: convenioIdTarifa, anioOrigen: anioTarifa, anioDestino: anioDestinoDuplicar });
      setMostrarDuplicar(false);
      setAnioDestinoDuplicar("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo duplicar la tarifa.");
    } finally {
      setDuplicando(false);
    }
  }

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

      {/* Lista de convenios */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base text-vino-900">Convenios</h3>
          <button onClick={() => setModalConvenio({ abierto: true, convenio: null })} className="rounded-lg bg-buganvilla px-3 py-1.5 text-xs font-medium text-white hover:opacity-90">
            + Nuevo convenio
          </button>
        </div>
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
              <button onClick={() => setModalConvenio({ abierto: true, convenio: c })} className="text-vino-700 hover:underline"><Pencil size={14} /></button>
            </div>
          ))}
          {convenios.length === 0 && <p className="px-4 py-6 text-center text-sm text-tinta/50">Todavía no hay convenios.</p>}
        </div>
      </div>

      {modalConvenio.abierto && (
        <ModalEditarConvenio convenio={modalConvenio.convenio} onCerrar={() => setModalConvenio({ abierto: false, convenio: null })} />
      )}

      {/* Tarifas registradas — para elegir cuál editar */}
      <div className="space-y-3">
        <h3 className="font-display text-base text-vino-900">Tarifas registradas</h3>
        <div className="divide-y divide-vino-50 rounded-xl border border-vino-100 bg-white">
          {tarifas.slice().sort((a, b) => (a.convenioId + a.anio).localeCompare(b.convenioId + b.anio)).map((t) => (
            <div key={`${t.convenioId}-${t.anio}`} className="flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <p className="font-medium text-vino-900">{convenios.find((c) => c.id === t.convenioId)?.nombre ?? t.convenioId} — {t.anio}</p>
                <p className="text-xs text-tinta/50">Básico: {formatoPesos(t.servicioCompletoBasico)}</p>
              </div>
              <button onClick={() => elegirTarifaExistente(t.convenioId, t.anio)} className="text-vino-700 hover:underline"><Pencil size={14} /></button>
            </div>
          ))}
          {tarifas.length === 0 && <p className="px-4 py-6 text-center text-sm text-tinta/50">Todavía no hay tarifas guardadas.</p>}
        </div>
      </div>

      {/* Formulario de tarifa — la `key` NO depende del año, solo del convenio+año elegidos por clic */}
      <div className="space-y-3 rounded-xl border border-vino-100 bg-white p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base text-vino-900">{tarifaExistente ? "Editar tarifa" : "Nueva tarifa"}</h3>
          {tarifaExistente && (
            <button onClick={() => setMostrarDuplicar((v) => !v)} className="flex items-center gap-1.5 text-xs text-vino-700 hover:underline">
              <Copy size={13} /> Duplicar a otro año
            </button>
          )}
        </div>

        {mostrarDuplicar && tarifaExistente && (
          <div className="flex items-center gap-2 rounded-lg bg-vino-50 p-3">
            <input value={anioDestinoDuplicar} onChange={(e) => setAnioDestinoDuplicar(e.target.value)} placeholder="Año destino (ej. 2027)" className="rounded-lg border border-vino-100 px-3 py-1.5 text-sm" />
            <button onClick={manejarDuplicar} disabled={duplicando || !anioDestinoDuplicar} className="rounded-lg bg-vino-700 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60">
              {duplicando ? "Duplicando…" : `Copiar ${anioTarifa} → ${anioDestinoDuplicar || "…"}`}
            </button>
          </div>
        )}

        <form onSubmit={manejarGuardarTarifa} className="grid gap-3 sm:grid-cols-2">
          <select value={convenioIdTarifa} onChange={(e) => { setConvenioIdTarifa(e.target.value); }} required className="rounded-lg border border-vino-100 px-3 py-2 text-sm sm:col-span-2">
            <option value="">Convenio…</option>
            {convenios.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <input value={anioTarifa} onChange={(e) => setAnioTarifa(e.target.value)} required placeholder="Año (ej. 2026)" className="rounded-lg border border-vino-100 px-3 py-2 text-sm" />
          <div />
          <CampoPrecio name="servicioCompletoBasico" placeholder="Servicio completo básico" valorInicial={valoresForm.servicioCompletoBasico} />
          <CampoPrecio name="servicioCompletoSemilujo" placeholder="Semilujo (opcional)" valorInicial={valoresForm.servicioCompletoSemilujo} />
          <CampoPrecio name="servicioCompletoLujo" placeholder="Lujo (opcional)" valorInicial={valoresForm.servicioCompletoLujo} />
          <CampoPrecio name="iniciales" placeholder="Iniciales" valorInicial={valoresForm.iniciales} />
          <CampoPrecio name="finales" placeholder="Finales" valorInicial={valoresForm.finales} />
          <CampoPrecio name="trasladoLocal" placeholder="Traslado local" valorInicial={valoresForm.trasladoLocal} />
          <CampoPrecio name="trasladoFluvial" placeholder="Traslado fluvial" valorInicial={valoresForm.trasladoFluvial} />
          <CampoPrecio name="precioCofre" placeholder="Precio cofre" valorInicial={valoresForm.precioCofre} />
          <CampoPrecio name="precioBoveda" placeholder="Precio bóveda" valorInicial={valoresForm.precioBoveda} />
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