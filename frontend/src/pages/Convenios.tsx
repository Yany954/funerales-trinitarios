import { useEffect, useMemo, useState } from "react";
import { collection, collectionGroup, onSnapshot, query } from "firebase/firestore";
import { Plus, Pencil, FileSignature, MapPin, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { db } from "../api/client";
import ModalEditarConvenio from "../components/ModalEditarConvenio";
import ModalTarifa, { GRUPOS_TARIFA } from "../components/ModalTarifa";
import { BarraSegmentada, COLORES_MARCA } from "../components/BarraSegmentada";
import { useEstadoCarga, AvisoCarga } from "../hooks/useEstadoCarga";
import { formatoPesos } from "../utils/formato";
import type { Convenio, TarifaConvenio } from "../types";

interface TarifaConId extends TarifaConvenio {
  convenioId: string;
}

const TIPO: Record<Convenio["tipo"], string> = {
  alcaldia: "Alcaldía",
  empresa_exequial: "Empresa exequial",
  interno: "Interno",
};

const ANIO_ACTUAL = String(new Date().getFullYear());

const CAMPOS = GRUPOS_TARIFA.flatMap((g) => g.campos);

export default function Convenios() {
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [tarifas, setTarifas] = useState<TarifaConId[]>([]);
  const carga = useEstadoCarga();

  const [modalConvenio, setModalConvenio] = useState<{ abierto: boolean; convenio: Convenio | null }>({ abierto: false, convenio: null });
  const [modalTarifa, setModalTarifa] = useState<{ convenio: Convenio; anio: string } | null>(null);
  const [metrica, setMetrica] = useState<(typeof CAMPOS)[number]["campo"]>("servicioCompletoBasico");

  useEffect(() => {
    return onSnapshot(
      query(collection(db, "convenios")),
      (snap) => {
        setConvenios(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Convenio)).sort((a, b) => a.nombre.localeCompare(b.nombre)));
        carga.listo();
      },
      (err) => carga.fallo(err)
    );
  }, [carga.intento]);

  useEffect(() => {
    return onSnapshot(
      query(collectionGroup(db, "tarifas")),
      (snap) => setTarifas(snap.docs.map((d) => ({ ...(d.data() as TarifaConvenio), convenioId: d.ref.parent.parent!.id }))),
      (err) => console.error("Error cargando tarifas:", err)
    );
  }, []);

  const tarifasDe = (convenioId: string) =>
    tarifas.filter((t) => t.convenioId === convenioId).sort((a, b) => Number(b.anio) - Number(a.anio));

  const sinTarifaActual = convenios.filter((c) => !tarifas.some((t) => t.convenioId === c.id && t.anio === ANIO_ACTUAL));
  const conTarifaActual = convenios.length - sinTarifaActual.length;

  const anios = useMemo(() => Array.from(new Set(tarifas.map((t) => t.anio))).sort().slice(-4), [tarifas]);
  const datosGrafica = useMemo(
    () =>
      convenios.map((c) => {
        const fila: Record<string, string | number> = { nombre: c.nombre };
        anios.forEach((anio) => {
          const t = tarifas.find((x) => x.convenioId === c.id && x.anio === anio);
          fila[anio] = (t?.[metrica] as number | undefined) ?? 0;
        });
        return fila;
      }),
    [convenios, tarifas, anios, metrica]
  );

  return (
    <div className="space-y-8">
      {/* Encabezado */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h2 className="font-display text-2xl text-vino-900">Convenios y tarifas</h2>
          <p className="mt-1 text-sm text-tinta/70">
            Cada convenio (alcaldía o empresa exequial) tiene una tarifa por año. Al registrar un servicio con un convenio, los precios salen de su tarifa de ese año.
          </p>
        </div>
        <button
          onClick={() => setModalConvenio({ abierto: true, convenio: null })}
          className="flex min-h-[44px] items-center gap-2 rounded-lg bg-vino-700 px-4 text-sm font-medium text-white transition hover:bg-vino-600 active:translate-y-px"
        >
          <Plus size={16} aria-hidden="true" /> Nuevo convenio
        </button>
      </header>

      <AvisoCarga carga={carga} />

      {/* Cómo funciona: tres pasos */}
      <ol className="grid gap-3 sm:grid-cols-3" aria-label="Cómo funciona">
        {[
          { n: 1, t: "Crea el convenio", d: "Nombre, tipo y municipios que cubre." },
          { n: 2, t: "Agrega su tarifa del año", d: 'Botón "Agregar tarifa" en la tarjeta del convenio.' },
          { n: 3, t: "Registra servicios", d: "Al elegir el convenio, el precio se toma de la tarifa." },
        ].map((p) => (
          <li key={p.n} className="flex gap-3 rounded-xl border border-vino-100 bg-white p-4">
            <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-vino-50 font-display text-sm text-vino-700">
              {p.n}
            </span>
            <div>
              <p className="text-sm font-semibold text-vino-900">{p.t}</p>
              <p className="text-xs text-tinta/70">{p.d}</p>
            </div>
          </li>
        ))}
      </ol>

      {/* Resumen: cuántos convenios tienen tarifa este año */}
      {convenios.length > 0 && (
        <section aria-labelledby="resumen-tarifas" className="rounded-2xl border border-vino-100 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 id="resumen-tarifas" className="flex items-center gap-2 font-display text-base text-vino-900">
                Tarifas {ANIO_ACTUAL}
              </h3>
              <p className="text-sm text-tinta/70">
                {sinTarifaActual.length === 0 ? "Todos los convenios tienen precios para este año." : `Falta: ${sinTarifaActual.map((c) => c.nombre).join(", ")}.`}
              </p>
            </div>
            {sinTarifaActual.length > 0 && (
              <button
                onClick={() => setModalTarifa({ convenio: sinTarifaActual[0], anio: ANIO_ACTUAL })}
                className="flex min-h-[44px] items-center gap-2 rounded-lg bg-buganvilla px-4 text-sm font-medium text-white transition hover:opacity-90 active:translate-y-px"
              >
                Agregar tarifa de {sinTarifaActual[0].nombre} <ArrowRight size={16} aria-hidden="true" />
              </button>
            )}
          </div>
          <div className="mt-4 space-y-2">
            <p className="flex items-baseline gap-1.5">
              <span className="font-display text-3xl text-vino-900 tabular-nums">{conTarifaActual}</span>
              <span className="text-sm text-tinta/70">de {convenios.length} convenios con tarifa {ANIO_ACTUAL}</span>
            </p>
            <BarraSegmentada valor={conTarifaActual} total={convenios.length} etiqueta={`Convenios con tarifa ${ANIO_ACTUAL}`} />
          </div>
        </section>
      )}

      {/* Tarjetas de convenios */}
      <section aria-label="Convenios" className="grid gap-4 lg:grid-cols-2">
        {convenios.map((c) => (
          <TarjetaConvenio
            key={c.id}
            convenio={c}
            tarifas={tarifasDe(c.id)}
            onEditar={() => setModalConvenio({ abierto: true, convenio: c })}
            onTarifa={(anio) => setModalTarifa({ convenio: c, anio })}
          />
        ))}
        {!carga.cargando && convenios.length === 0 && (
          <div className="rounded-2xl border border-dashed border-vino-400 bg-white p-8 text-center lg:col-span-2">
            <FileSignature size={28} aria-hidden="true" className="mx-auto text-vino-400" />
            <p className="mt-2 font-display text-lg text-vino-900">Todavía no hay convenios</p>
            <p className="text-sm text-tinta/70">Crea el primero con el botón "Nuevo convenio".</p>
          </div>
        )}
        {carga.cargando && <p className="text-sm text-tinta/70">Cargando…</p>}
      </section>

      {/* Comparación entre convenios */}
      {datosGrafica.length > 0 && anios.length > 0 && (
        <section aria-labelledby="comparar" className="rounded-2xl border border-vino-100 bg-white p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 id="comparar" className="font-display text-base text-vino-900">Comparar convenios</h3>
              <p className="text-xs text-tinta/70">Un precio a la vez, por año (últimos {anios.length}).</p>
            </div>
            <label className="flex items-center gap-2 text-sm text-tinta/70">
              Precio
              <select value={metrica} onChange={(e) => setMetrica(e.target.value as typeof metrica)} className="rounded-lg border border-vino-100 px-3 py-2 text-sm text-tinta">
                {GRUPOS_TARIFA.map((g) => (
                  <optgroup key={g.titulo} label={g.titulo}>
                    {g.campos.map((m) => (
                      <option key={m.campo} value={m.campo}>
                        {m.etiqueta}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
          </div>
          <div role="img" aria-label={`Gráfica de barras: ${CAMPOS.find((m) => m.campo === metrica)?.etiqueta} por convenio y año`}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={datosGrafica} margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3DEE6" />
                <XAxis dataKey="nombre" tick={{ fontSize: 12, fill: "#2B2530" }} />
                <YAxis tickFormatter={(v) => `$${Math.round(v / 1000)}k`} tick={{ fontSize: 12, fill: "#2B2530" }} />
                <Tooltip formatter={(value: unknown) => formatoPesos(Number(value))} cursor={{ fill: "#FBF2F5" }} />
                <Legend />
                {anios.map((anio, i) => (
                  <Bar key={anio} dataKey={anio} fill={COLORES_MARCA[(anios.length - 1 - i) % COLORES_MARCA.length]} radius={[4, 4, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {modalConvenio.abierto && (
        <ModalEditarConvenio convenio={modalConvenio.convenio} onCerrar={() => setModalConvenio({ abierto: false, convenio: null })} />
      )}
      {modalTarifa && (
        <ModalTarifa
          convenio={modalTarifa.convenio}
          tarifas={tarifasDe(modalTarifa.convenio.id)}
          anioInicial={modalTarifa.anio}
          onCerrar={() => setModalTarifa(null)}
        />
      )}
    </div>
  );
}

function TarjetaConvenio({
  convenio,
  tarifas,
  onEditar,
  onTarifa,
}: {
  convenio: Convenio;
  tarifas: TarifaConId[];
  onEditar: () => void;
  onTarifa: (anio: string) => void;
}) {
  const [anioVisto, setAnioVisto] = useState<string | null>(null);
  const actual = tarifas.find((t) => t.anio === ANIO_ACTUAL);
  const vista = tarifas.find((t) => t.anio === anioVisto) ?? actual ?? tarifas[0];
  const siguiente = String(Number(tarifas[0]?.anio ?? ANIO_ACTUAL) + 1);
  const precios = vista ? CAMPOS.filter(({ campo }) => vista[campo] !== undefined && vista[campo] !== null) : [];

  return (
    <article className="flex flex-col rounded-2xl border border-vino-100 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-lg text-vino-900">{convenio.nombre}</h3>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-tinta/70">
            <span className="rounded-full bg-vino-50 px-2 py-0.5 font-medium text-vino-700">{TIPO[convenio.tipo]}</span>
            {convenio.numeroContrato && <span>Contrato {convenio.numeroContrato}</span>}
            {convenio.coberturaGeografica?.length > 0 && (
              <span className="flex items-center gap-1">
                <MapPin size={12} aria-hidden="true" /> {convenio.coberturaGeografica.join(", ")}
              </span>
            )}
          </p>
        </div>
        <button onClick={onEditar} aria-label={`Editar datos de ${convenio.nombre}`} className="rounded-lg p-2 text-vino-700 hover:bg-vino-50">
          <Pencil size={16} aria-hidden="true" />
        </button>
      </div>

      {/* Estado de la tarifa del año */}
      <p className={`mt-4 flex items-center gap-1.5 text-sm font-medium ${actual ? "text-green-700" : "text-amber-800"}`}>
        {actual ? <CheckCircle2 size={16} aria-hidden="true" /> : <AlertCircle size={16} aria-hidden="true" />}
        {actual ? `Tiene tarifa ${ANIO_ACTUAL}` : `Sin tarifa ${ANIO_ACTUAL}`}
      </p>

      {tarifas.length > 0 ? (
        <>
          {/* Años con tarifa */}
          <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Años con tarifa">
            {tarifas.map((t) => (
              <button
                key={t.anio}
                type="button"
                onClick={() => setAnioVisto(t.anio)}
                aria-pressed={vista?.anio === t.anio}
                className={`min-h-[32px] rounded-full px-3 text-xs font-medium tabular-nums transition ${
                  vista?.anio === t.anio ? "bg-vino-700 text-white" : "border border-vino-100 text-tinta/70 hover:bg-vino-50"
                }`}
              >
                {t.anio}
              </button>
            ))}
          </div>

          {/* Precios del año elegido */}
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
            {precios.map(({ campo, etiqueta }) => (
              <div key={campo}>
                <dt className="text-xs text-tinta/70">{etiqueta}</dt>
                <dd className="font-medium tabular-nums text-tinta">{formatoPesos(vista![campo] as number)}</dd>
              </div>
            ))}
            {precios.length === 0 && <p className="col-span-full text-xs text-tinta/70">Esta tarifa no tiene precios.</p>}
          </dl>
        </>
      ) : (
        <p className="mt-3 text-sm text-tinta/70">Todavía no tiene tarifas. Agrega la de {ANIO_ACTUAL} para poder usarlo en servicios.</p>
      )}

      <div className="mt-5 flex flex-wrap gap-2 border-t border-vino-50 pt-4">
        {!actual ? (
          <button
            onClick={() => onTarifa(ANIO_ACTUAL)}
            className="flex min-h-[44px] items-center gap-2 rounded-lg bg-buganvilla px-4 text-sm font-medium text-white transition hover:opacity-90 active:translate-y-px"
          >
            <Plus size={16} aria-hidden="true" /> Agregar tarifa {ANIO_ACTUAL}
          </button>
        ) : (
          <button
            onClick={() => onTarifa(siguiente)}
            className="flex min-h-[44px] items-center gap-2 rounded-lg border border-vino-100 px-4 text-sm font-medium text-vino-700 transition hover:bg-vino-50"
          >
            <Plus size={16} aria-hidden="true" /> Agregar tarifa {siguiente}
          </button>
        )}
        {vista && (
          <button
            onClick={() => onTarifa(vista.anio)}
            className="flex min-h-[44px] items-center gap-2 rounded-lg border border-vino-100 px-4 text-sm font-medium text-vino-700 transition hover:bg-vino-50"
          >
            <Pencil size={14} aria-hidden="true" /> Editar tarifa {vista.anio}
          </button>
        )}
      </div>
    </article>
  );
}
