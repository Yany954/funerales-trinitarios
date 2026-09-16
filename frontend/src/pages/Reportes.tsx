import { useEffect, useState, FormEvent } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { BarChart3 } from "lucide-react";
import { db, generarReporte } from "../api/client";
import { useRol } from "../auth/RolContext";
import type { Convenio, FilaReporte, TipoFiltroReporte } from "../types";
import { formatoPesos, formatoFecha } from "../utils/formato";

const SEDES = ["Pailitas", "Tamalameque", "Pelaya", "Curumaní"] as const;

export default function Reportes() {
  const { rol, sedeAsignada, cargando: cargandoRol } = useRol();
if (cargandoRol) return <div className="py-16 text-center text-tinta/50">Cargando…</div>;
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [filtroTipo, setFiltroTipo] = useState<TipoFiltroReporte>(rol === "admin" ? "alcaldia" : "sede");
  const [filas, setFilas] = useState<FilaReporte[] | null>(null);
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return onSnapshot(query(collection(db, "convenios")), (snap) =>
      setConvenios(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Convenio)))
    );
  }, []);

  const opciones =
    filtroTipo === "alcaldia" ? convenios.filter((c) => c.tipo === "alcaldia")
    : filtroTipo === "convenio" ? convenios.filter((c) => c.tipo === "empresa_exequial")
    : null;

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
        {rol === "admin" && (
          <div className="flex gap-2">
            {(["alcaldia", "convenio", "sede"] as TipoFiltroReporte[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setFiltroTipo(t)}
                className={`rounded-full px-3.5 py-1.5 text-sm capitalize ${
                  filtroTipo === t ? "bg-vino-700 text-white" : "bg-vino-50 text-vino-700"
                }`}
              >
                {t === "alcaldia" ? "Alcaldía" : t}
              </button>
            ))}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          {filtroTipo === "sede" ? (
            rol === "admin" ? (
              <select name="filtroValor" required className="rounded-lg border border-vino-100 px-3 py-2 text-sm">
                <option value="">Sede…</option>
                {SEDES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : (
              <input type="hidden" name="filtroValor" value={sedeAsignada ?? ""} />
            )
          ) : (
            <select name="filtroValor" required className="rounded-lg border border-vino-100 px-3 py-2 text-sm">
              <option value="">{filtroTipo === "alcaldia" ? "Alcaldía…" : "Convenio…"}</option>
              {opciones?.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          )}
          <input name="fechaInicio" type="date" required className="rounded-lg border border-vino-100 px-3 py-2 text-sm" />
          <input name="fechaFin" type="date" required className="rounded-lg border border-vino-100 px-3 py-2 text-sm" />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={generando}
          className="flex items-center gap-2 rounded-lg bg-buganvilla px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
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
                    <span className="font-medium text-vino-900">{formatoFecha(f.fecha)}</span>
                    {" — "}
                    {f.fallecido}: {f.descripcion}
                    {f.usoBoveda && <span className="ml-1 text-xs text-vino-700">(con bóveda)</span>}
                    {" — "}
                    <span className="font-medium">{formatoPesos(f.valor)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-right font-display text-lg text-vino-900">
                Total: {formatoPesos(total)}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}