import { useEffect, useMemo, useState, FormEvent } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { BarChart3, Check, ClipboardList, Clock, Landmark, Wallet } from "lucide-react";
import { db, generarReporteMensual, generarReporte } from "../api/client";
import { useRol } from "../auth/RolContext";
import { formatoPesos, formatoFecha } from "../utils/formato";
import { COLORES_MARCA } from "../components/BarraSegmentada";
import type { Convenio, FilaReporte, FilaReporteMensual, FiltroReporteMensual, TipoFiltroReporte } from "../types";

function primerDiaDelMes(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Color de cada estado de facturación (mismo criterio en todo el reporte). */
function claseEstado(estado: string): string {
  if (estado === "pagado") return "bg-green-50 text-green-700";
  if (estado === "facturado") return "bg-vino-50 text-vino-700";
  return "bg-amber-50 text-amber-800"; // pendiente por facturar
}

const claseCampo = "w-full rounded-lg border border-vino-100 bg-white px-3 py-2 text-sm";

function Cifra({ titulo, valor, icono: Icono, clase = "text-vino-900" }: { titulo: string; valor: string; icono: typeof Wallet; clase?: string }) {
  return (
    <div className="rounded-2xl border border-vino-100 bg-white p-5">
      <p className="flex items-center gap-2 text-sm text-tinta/70">
        <Icono size={16} aria-hidden="true" /> {titulo}
      </p>
      <p className={`mt-1 font-display text-2xl tabular-nums sm:text-3xl ${clase}`}>{valor}</p>
    </div>
  );
}

export default function Reportes() {
  const { sedeSeleccionada, cargando: cargandoRol } = useRol();
  const [pestaña, setPestaña] = useState<"mensual" | "porConvenio">("mensual");

  return (
    <div className="space-y-8">
      <header className="max-w-2xl">
        <h2 className="font-display text-2xl text-vino-900">Reportes</h2>
        <p className="mt-1 text-sm text-tinta/70">
          Lo que se facturó en cada sede y lo que está pendiente por cobrar a alcaldías y convenios.
        </p>
      </header>

      <div className="inline-flex flex-wrap gap-1 rounded-xl bg-vino-50 p-1" role="tablist" aria-label="Tipo de reporte">
        {([
          { valor: "mensual", etiqueta: "Reporte mensual por sede" },
          { valor: "porConvenio", etiqueta: "Facturación por alcaldía / convenio" },
        ] as const).map((p) => (
          <button
            key={p.valor}
            role="tab"
            aria-selected={pestaña === p.valor}
            onClick={() => setPestaña(p.valor)}
            className={`min-h-[40px] rounded-lg px-4 text-sm font-medium transition ${pestaña === p.valor ? "bg-vino-700 text-white shadow-sm" : "text-vino-700 hover:bg-white"}`}
          >
            {p.etiqueta}
          </button>
        ))}
      </div>

      {!cargandoRol && (pestaña === "mensual" ? <ReporteMensual sedeSeleccionada={sedeSeleccionada} /> : <ReportePorConvenio />)}
    </div>
  );
}

const SEDES = ["Pailitas", "Tamalameque", "Pelaya", "Curumaní"] as const;

function ReporteMensual({ sedeSeleccionada }: { sedeSeleccionada: string }) {
  const [filtro, setFiltro] = useState<FiltroReporteMensual>("todos");
  const [sedeReporte, setSedeReporte] = useState("header"); // "header" = usar el selector global de arriba
  const [fechaInicio, setFechaInicio] = useState(primerDiaDelMes());
  const [fechaFin, setFechaFin] = useState(hoy());
  const [filas, setFilas] = useState<FilaReporteMensual[] | null>(null);
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sedeEfectiva = sedeReporte === "header" ? sedeSeleccionada : sedeReporte;

  async function generar() {
    setError(null);
    setGenerando(true);
    try {
      const resultado = await generarReporteMensual({ sede: sedeEfectiva, filtro, fechaInicio, fechaFin });
      setFilas(resultado);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo generar el reporte.");
    } finally {
      setGenerando(false);
    }
  }

  useEffect(() => { generar(); }, [sedeEfectiva]);

  const agrupadoPorSede = useMemo(() => {
    if (!filas) return {};
    return filas.reduce<Record<string, FilaReporteMensual[]>>((acc, f) => {
      (acc[f.sede] ??= []).push(f);
      return acc;
    }, {});
  }, [filas]);

  const total = filas?.reduce((s, f) => s + f.valorTotal, 0) ?? 0;
  const pendientes = filas?.filter((f) => f.estadoFacturacion !== "pagado") ?? [];
  const valorPendiente = pendientes.reduce((s, f) => s + f.valorTotal, 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 rounded-2xl border border-vino-100 bg-white p-5 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto] lg:items-end">
        <div>
          <label htmlFor="rep-filtro" className="mb-1 block text-xs font-medium text-tinta/70">Qué servicios</label>
          <select id="rep-filtro" value={filtro} onChange={(e) => setFiltro(e.target.value as FiltroReporteMensual)} className={claseCampo}>
            <option value="todos">Todos los servicios</option>
            <option value="convenioPendienteFacturar">Convenio pendiente de facturar</option>
            <option value="facturado">Facturado (pendiente de pago)</option>
            <option value="facturadoAlcaldia">Facturado — Alcaldía (pendiente de pago)</option>
          </select>
        </div>
        <div>
          <label htmlFor="rep-sede" className="mb-1 block text-xs font-medium text-tinta/70">Sede</label>
          <select id="rep-sede" value={sedeReporte} onChange={(e) => setSedeReporte(e.target.value)} className={claseCampo}>
            <option value="header">La de arriba ({sedeSeleccionada === "all" ? "todas" : sedeSeleccionada})</option>
            <option value="all">Todas las sedes</option>
            {SEDES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="rep-desde" className="mb-1 block text-xs font-medium text-tinta/70">Desde</label>
          <input id="rep-desde" type="date" min="1900-01-01" max="2100-12-31" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className={claseCampo} />
        </div>
        <div>
          <label htmlFor="rep-hasta" className="mb-1 block text-xs font-medium text-tinta/70">Hasta</label>
          <input id="rep-hasta" type="date" min="1900-01-01" max="2100-12-31" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className={claseCampo} />
        </div>
        <button onClick={generar} disabled={generando} className="flex min-h-[42px] items-center justify-center gap-2 rounded-lg bg-vino-700 px-5 text-sm font-medium text-white transition hover:bg-vino-600 active:translate-y-px disabled:opacity-60">
          <BarChart3 size={16} aria-hidden="true" />
          {generando ? "Generando…" : "Generar"}
        </button>
      </div>

      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {filas && (
        <section aria-label="Resumen del reporte" className="grid gap-3 sm:grid-cols-3">
          <Cifra titulo="Total del período" valor={formatoPesos(total)} icono={Wallet} />
          <Cifra titulo="Servicios" valor={String(filas.length)} icono={ClipboardList} />
          <Cifra titulo={`Sin pagar (${pendientes.length})`} valor={formatoPesos(valorPendiente)} icono={Clock} clase={valorPendiente > 0 ? "text-amber-700" : "text-green-700"} />
        </section>
      )}

      {filas && filas.length === 0 && (
        <div className="rounded-2xl border border-dashed border-vino-400 bg-white py-12 text-center">
          <p className="font-display text-lg text-vino-900">No hay servicios en este período</p>
          <p className="text-sm text-tinta/70">Prueba con otro filtro o un rango de fechas más amplio.</p>
        </div>
      )}

      {filas && filas.length > 0 && (
        <div className="space-y-6">
          {Object.entries(agrupadoPorSede).map(([sede, filasSede], indice) => {
            const totalSede = filasSede.reduce((s, f) => s + f.valorTotal, 0);
            const proporcion = total > 0 ? totalSede / total : 0;
            return (
              <section key={sede} aria-label={`Sede ${sede}`} className="overflow-hidden rounded-2xl border border-vino-100 bg-white">
                <div className="space-y-3 border-b border-vino-50 px-5 py-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-display text-lg text-vino-900">{sede}</h3>
                    <p className="text-sm text-tinta/70">
                      {filasSede.length} {filasSede.length === 1 ? "servicio" : "servicios"} ·{" "}
                      <span className="font-display text-xl tabular-nums text-vino-900">{formatoPesos(totalSede)}</span>
                    </p>
                  </div>
                  {Object.keys(agrupadoPorSede).length > 1 && (
                    <div className="flex items-center gap-3">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-vino-50">
                        <div className="h-full rounded-full" style={{ width: `${proporcion * 100}%`, backgroundColor: COLORES_MARCA[indice % COLORES_MARCA.length] }} />
                      </div>
                      <span className="w-12 text-right text-xs tabular-nums text-tinta/70">{(proporcion * 100).toFixed(0)} %</span>
                    </div>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="bg-crema text-xs uppercase tracking-wide text-tinta/60">
                      <tr>
                        <th scope="col" className="px-5 py-2.5 font-medium">Fecha</th>
                        <th scope="col" className="px-5 py-2.5 font-medium">Fallecido</th>
                        <th scope="col" className="px-5 py-2.5 font-medium">Convenio</th>
                        <th scope="col" className="px-5 py-2.5 font-medium">Servicio</th>
                        <th scope="col" className="px-5 py-2.5 text-center font-medium">Bóveda</th>
                        <th scope="col" className="px-5 py-2.5 font-medium">Estado</th>
                        <th scope="col" className="px-5 py-2.5 text-right font-medium">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-vino-50">
                      {filasSede.map((f) => (
                        <tr key={f.id} className="hover:bg-vino-50/40">
                          <td className="whitespace-nowrap px-5 py-3 tabular-nums text-tinta/80">{formatoFecha(f.fecha)}</td>
                          <td className="px-5 py-3 font-medium text-tinta">{f.fallecido}</td>
                          <td className="px-5 py-3 text-tinta/80">{f.convenio}</td>
                          <td className="px-5 py-3 text-tinta/80">{f.servicioPrestado}</td>
                          <td className="px-5 py-3 text-center">
                            {f.boveda ? <Check size={16} className="mx-auto text-green-700" aria-label="Con bóveda" /> : <span className="text-tinta/30" aria-label="Sin bóveda">—</span>}
                          </td>
                          <td className="px-5 py-3">
                            <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${claseEstado(f.estadoFacturacion)}`}>{f.estadoFacturacion}</span>
                          </td>
                          <td className="whitespace-nowrap px-5 py-3 text-right font-semibold tabular-nums text-tinta">{formatoPesos(f.valorTotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-crema">
                        <td colSpan={6} className="px-5 py-3 text-right text-sm font-medium text-tinta/70">Total {sede}</td>
                        <td className="whitespace-nowrap px-5 py-3 text-right font-display text-lg tabular-nums text-vino-900">{formatoPesos(totalSede)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </section>
            );
          })}
          {Object.keys(agrupadoPorSede).length > 1 && (
            <div className="flex items-center justify-between rounded-2xl bg-vino-700 px-5 py-4 text-white">
              <span className="text-sm font-medium">Total general</span>
              <span className="font-display text-2xl tabular-nums">{formatoPesos(total)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ReportePorConvenio() {
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [filtroTipo, setFiltroTipo] = useState<TipoFiltroReporte>("alcaldia");
  const [filas, setFilas] = useState<FilaReporte[] | null>(null);
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => onSnapshot(
    query(collection(db, "convenios")),
    (s) => setConvenios(s.docs.map((d) => ({ id: d.id, ...d.data() } as Convenio))),
    (err) => console.error("Error cargando convenios:", err)
  ), []);
  const opciones = filtroTipo === "alcaldia" ? convenios.filter((c) => c.tipo === "alcaldia") : convenios.filter((c) => c.tipo === "empresa_exequial");

  async function manejarGenerar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setGenerando(true);
    const form = new FormData(e.currentTarget);
    try {
      const resultado = await generarReporte({
        filtroTipo,
        filtroValor: String(form.get("filtroValor")),
        fechaInicio: String(form.get("fechaInicio")),
        fechaFin: String(form.get("fechaFin")),
      });
      setFilas(resultado);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo generar el reporte.");
    } finally {
      setGenerando(false);
    }
  }

  const total = filas?.reduce((s, f) => s + f.valor, 0) ?? 0;
  const conBoveda = filas?.filter((f) => f.usoBoveda).length ?? 0;

  return (
    <div className="space-y-6">
      <form onSubmit={manejarGenerar} className="space-y-4 rounded-2xl border border-vino-100 bg-white p-5">
        <div>
          <h3 className="font-display text-lg text-vino-900">Servicios pendientes por facturar</h3>
          <p className="text-sm text-tinta/70">Elige la alcaldía o el convenio y el período para armar la cuenta de cobro.</p>
        </div>
        <div className="inline-flex gap-1 rounded-xl bg-vino-50 p-1">
          {(["alcaldia", "convenio"] as TipoFiltroReporte[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setFiltroTipo(t)}
              aria-pressed={filtroTipo === t}
              className={`min-h-[38px] rounded-lg px-4 text-sm font-medium transition ${filtroTipo === t ? "bg-vino-700 text-white shadow-sm" : "text-vino-700 hover:bg-white"}`}
            >
              {t === "alcaldia" ? "Alcaldía" : "Convenio"}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-[1.5fr_1fr_1fr_auto] sm:items-end">
          <div>
            <label htmlFor="conv-valor" className="mb-1 block text-xs font-medium text-tinta/70">{filtroTipo === "alcaldia" ? "Alcaldía" : "Convenio"}</label>
            <select id="conv-valor" name="filtroValor" required className={claseCampo}>
              <option value="">Elige…</option>
              {opciones.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="conv-desde" className="mb-1 block text-xs font-medium text-tinta/70">Desde</label>
            <input id="conv-desde" name="fechaInicio" type="date" min="1900-01-01" max="2100-12-31" required className={claseCampo} />
          </div>
          <div>
            <label htmlFor="conv-hasta" className="mb-1 block text-xs font-medium text-tinta/70">Hasta</label>
            <input id="conv-hasta" name="fechaFin" type="date" min="1900-01-01" max="2100-12-31" required className={claseCampo} />
          </div>
          <button type="submit" disabled={generando} className="flex min-h-[42px] items-center justify-center gap-2 rounded-lg bg-vino-700 px-5 text-sm font-medium text-white transition hover:bg-vino-600 active:translate-y-px disabled:opacity-60">
            <BarChart3 size={16} aria-hidden="true" />
            {generando ? "Generando…" : "Generar reporte"}
          </button>
        </div>
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </form>

      {filas && filas.length === 0 && (
        <div className="rounded-2xl border border-dashed border-vino-400 bg-white py-12 text-center">
          <p className="font-display text-lg text-vino-900">Nada pendiente por facturar</p>
          <p className="text-sm text-tinta/70">No hay servicios pendientes en ese rango de fechas.</p>
        </div>
      )}

      {filas && filas.length > 0 && (
        <>
          <section aria-label="Resumen" className="grid gap-3 sm:grid-cols-3">
            <Cifra titulo="Por facturar" valor={formatoPesos(total)} icono={Wallet} clase="text-amber-700" />
            <Cifra titulo="Servicios" valor={String(filas.length)} icono={ClipboardList} />
            <Cifra titulo="Con bóveda" valor={String(conBoveda)} icono={Landmark} />
          </section>
          <div className="overflow-hidden rounded-2xl border border-vino-100 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead className="bg-crema text-xs uppercase tracking-wide text-tinta/60">
                  <tr>
                    <th scope="col" className="px-5 py-2.5 font-medium">Fecha</th>
                    <th scope="col" className="px-5 py-2.5 font-medium">Fallecido</th>
                    <th scope="col" className="px-5 py-2.5 font-medium">Descripción</th>
                    <th scope="col" className="px-5 py-2.5 text-center font-medium">Bóveda</th>
                    <th scope="col" className="px-5 py-2.5 text-right font-medium">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-vino-50">
                  {filas.map((f, i) => (
                    <tr key={i} className="hover:bg-vino-50/40">
                      <td className="whitespace-nowrap px-5 py-3 tabular-nums text-tinta/80">{formatoFecha(f.fecha)}</td>
                      <td className="px-5 py-3 font-medium text-tinta">{f.fallecido}</td>
                      <td className="px-5 py-3 text-tinta/80">{f.descripcion}</td>
                      <td className="px-5 py-3 text-center">
                        {f.usoBoveda ? <Check size={16} className="mx-auto text-green-700" aria-label="Con bóveda" /> : <span className="text-tinta/30" aria-label="Sin bóveda">—</span>}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right font-semibold tabular-nums text-tinta">{formatoPesos(f.valor)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-vino-700 text-white">
                    <td colSpan={4} className="px-5 py-3 text-right text-sm font-medium">Total por facturar</td>
                    <td className="whitespace-nowrap px-5 py-3 text-right font-display text-lg tabular-nums">{formatoPesos(total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
