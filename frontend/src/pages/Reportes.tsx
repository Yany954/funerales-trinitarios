import { useEffect, useMemo, useState, FormEvent } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { BarChart3 } from "lucide-react";
import { db, generarReporteMensual, generarReporte } from "../api/client";
import { useRol } from "../auth/RolContext";
import { formatoPesos, formatoFecha } from "../utils/formato";
import type { Convenio, FilaReporte, FilaReporteMensual, FiltroReporteMensual, TipoFiltroReporte } from "../types";

function primerDiaDelMes(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function Reportes() {
  const { sedeSeleccionada, cargando: cargandoRol } = useRol();
  const [pestaña, setPestaña] = useState<"mensual" | "porConvenio">("mensual");

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <button onClick={() => setPestaña("mensual")} className={`rounded-full px-3.5 py-1.5 text-sm ${pestaña === "mensual" ? "bg-vino-700 text-white" : "bg-white text-tinta/60 border border-vino-100"}`}>
          Reporte mensual por sede
        </button>
        <button onClick={() => setPestaña("porConvenio")} className={`rounded-full px-3.5 py-1.5 text-sm ${pestaña === "porConvenio" ? "bg-vino-700 text-white" : "bg-white text-tinta/60 border border-vino-100"}`}>
          Facturación por Alcaldía / Convenio
        </button>
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-vino-100 bg-white p-4">
        <div>
          <label className="mb-1 block text-xs text-tinta/50">Filtro</label>
          <select value={filtro} onChange={(e) => setFiltro(e.target.value as FiltroReporteMensual)} className="rounded-lg border border-vino-100 px-3 py-2 text-sm">
            <option value="todos">Todos los servicios</option>
            <option value="convenioPendienteFacturar">Convenio pendiente de facturar</option>
            <option value="facturado">Facturado (pendiente de pago)</option>
            <option value="facturadoAlcaldia">Facturado — Alcaldía (pendiente de pago)</option>
          </select>
        </div>
        <div>
  <label className="mb-1 block text-xs text-tinta/50">Sede</label>
  <select value={sedeReporte} onChange={(e) => setSedeReporte(e.target.value)} className="rounded-lg border border-vino-100 px-3 py-2 text-sm">
    <option value="header">Usar selector de arriba ({sedeSeleccionada === "all" ? "Todas" : sedeSeleccionada})</option>
    <option value="all">Todas las sedes</option>
    {SEDES.map((s) => <option key={s} value={s}>{s}</option>)}
  </select>
</div>
        <div>
          <label className="mb-1 block text-xs text-tinta/50">Desde</label>
          <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="rounded-lg border border-vino-100 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-tinta/50">Hasta</label>
          <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="rounded-lg border border-vino-100 px-3 py-2 text-sm" />
        </div>
        <button onClick={generar} disabled={generando} className="flex items-center gap-2 rounded-lg bg-buganvilla px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">
          <BarChart3 size={16} />
          {generando ? "Generando…" : "Generar"}
        </button>
        <p className="text-xs text-tinta/50">
  Mostrando: {sedeEfectiva === "all" ? "todas las sedes" : sedeEfectiva}
</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {filas && filas.length === 0 && (
        <div className="rounded-xl border border-dashed border-vino-100 bg-white py-10 text-center text-sm text-tinta/50">
          No hay servicios que coincidan con este filtro y rango de fechas.
        </div>
      )}

      {filas && filas.length > 0 && (
        <div className="space-y-6">
          {Object.entries(agrupadoPorSede).map(([sede, filasSede]) => (
            <div key={sede} className="overflow-hidden rounded-xl border border-vino-100 bg-white">
              <div className="flex items-center justify-between bg-vino-50 px-4 py-2.5">
                <p className="font-display text-base text-vino-900">{sede}</p>
                <p className="text-sm text-vino-700">{formatoPesos(filasSede.reduce((s, f) => s + f.valorTotal, 0))}</p>
              </div>
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-tinta/50">
                  <tr>
                    <th className="px-4 py-2 font-medium">Fecha</th>
                    <th className="px-4 py-2 font-medium">Convenio</th>
                    <th className="px-4 py-2 font-medium">Fallecido</th>
                    <th className="px-4 py-2 font-medium">Servicio prestado</th>
                    <th className="px-4 py-2 font-medium">Bóveda</th>
                    <th className="px-4 py-2 font-medium">Estado</th>
                    <th className="px-4 py-2 text-right font-medium">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-vino-50">
                  {filasSede.map((f) => (
                    <tr key={f.id}>
                      <td className="px-4 py-2">{formatoFecha(f.fecha)}</td>
                      <td className="px-4 py-2">{f.convenio}</td>
                      <td className="px-4 py-2">{f.fallecido}</td>
                      <td className="px-4 py-2">{f.servicioPrestado}</td>
                      <td className="px-4 py-2">{f.boveda ? "Sí" : "No"}</td>
                      <td className="px-4 py-2 text-xs">{f.estadoFacturacion}</td>
                      <td className="px-4 py-2 text-right">{formatoPesos(f.valorTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          <p className="text-right font-display text-lg text-vino-900">Total general: {formatoPesos(total)}</p>
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

  useEffect(() => onSnapshot(query(collection(db, "convenios")), (s) => setConvenios(s.docs.map((d) => ({ id: d.id, ...d.data() } as Convenio)))), []);
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

  return (
    <div className="space-y-6">
      <h2 className="font-display text-lg text-vino-900">Servicios pendientes por facturar</h2>
      <form onSubmit={manejarGenerar} className="space-y-3 rounded-xl border border-vino-100 bg-white p-4">
        <div className="flex gap-2">
          {(["alcaldia", "convenio"] as TipoFiltroReporte[]).map((t) => (
            <button key={t} type="button" onClick={() => setFiltroTipo(t)} className={`rounded-full px-3.5 py-1.5 text-sm capitalize ${filtroTipo === t ? "bg-vino-700 text-white" : "bg-vino-50 text-vino-700"}`}>
              {t === "alcaldia" ? "Alcaldía" : "Convenio"}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <select name="filtroValor" required className="rounded-lg border border-vino-100 px-3 py-2 text-sm">
            <option value="">{filtroTipo === "alcaldia" ? "Alcaldía…" : "Convenio…"}</option>
            {opciones.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <input name="fechaInicio" type="date" required className="rounded-lg border border-vino-100 px-3 py-2 text-sm" />
          <input name="fechaFin" type="date" required className="rounded-lg border border-vino-100 px-3 py-2 text-sm" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={generando} className="flex items-center gap-2 rounded-lg bg-buganvilla px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">
          <BarChart3 size={16} />
          {generando ? "Generando…" : "Generar reporte"}
        </button>
      </form>

      {filas && (
        <div className="rounded-xl border border-vino-100 bg-white p-4">
          {filas.length === 0 ? (
            <p className="text-sm text-tinta/60">No hay servicios pendientes por facturar en ese rango.</p>
          ) : (
            <>
              <ul className="divide-y divide-vino-50">
                {filas.map((f, i) => (
                  <li key={i} className="py-2.5 text-sm">
                    <span className="font-medium text-vino-900">{formatoFecha(f.fecha)}</span> — {f.fallecido}: {f.descripcion}
                    {f.usoBoveda && <span className="ml-1 text-xs text-vino-700">(con bóveda)</span>}
                    {" — "}<span className="font-medium">{formatoPesos(f.valor)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-right font-display text-lg text-vino-900">Total: {formatoPesos(total)}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}