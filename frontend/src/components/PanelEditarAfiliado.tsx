import { useState, FormEvent } from "react";
import { X, Save } from "lucide-react";
import { actualizarAfiliado } from "../api/client";
import CampoPrecio from "./CampoPrecio";
import type { Afiliado, PlanFunerario } from "../types";
import { VEREDAS_POR_MUNICIPIO } from "../types";
interface Props {
  afiliado: Afiliado;
  planes: PlanFunerario[];
  onCerrar: () => void;
}

function aInputDate(valor: unknown): string {
  const conToDate = valor as { toDate?: () => Date };
  const fecha = conToDate?.toDate ? conToDate.toDate() : new Date(valor as string);
  return isNaN(fecha.getTime()) ? "" : fecha.toISOString().slice(0, 10);
}

export default function PanelEditarAfiliado({ afiliado, planes, onCerrar }: Props) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [veredaSeleccionada, setVeredaSeleccionada] = useState(afiliado.vereda ?? "");

  async function manejarGuardar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    const form = new FormData(e.currentTarget);
    try {
      await actualizarAfiliado({
        id: afiliado.id,
        nombreCompleto: String(form.get("nombreCompleto")),
        cedula: String(form.get("cedula")),
        numeroContrato: String(form.get("numeroContrato")),
        planId: String(form.get("planId")),
        vereda: String(form.get("vereda") || "") || undefined,
        fechaAfiliacionReal: String(form.get("fechaAfiliacionReal")),
        fechaNacimiento: String(form.get("fechaNacimiento")),
        valorCuotaMensual: Number(form.get("valorCuotaMensual")),
        tieneSeguroVida: form.get("tieneSeguroVida") === "on",
      });
      onCerrar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-tinta/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg text-vino-900">Editar afiliado</h3>
          <button onClick={onCerrar} className="text-tinta/40 hover:text-tinta"><X size={20} /></button>
        </div>
        <form onSubmit={manejarGuardar} className="space-y-3">
          <input name="nombreCompleto" required defaultValue={afiliado.nombreCompleto} placeholder="Nombre completo" className="w-full rounded-lg border border-vino-100 px-3 py-2 text-sm" />
          <input name="cedula" required defaultValue={afiliado.cedula} placeholder="Cédula" className="w-full rounded-lg border border-vino-100 px-3 py-2 text-sm" />
          <input name="numeroContrato" required defaultValue={afiliado.numeroContrato} placeholder="Número de contrato" className="w-full rounded-lg border border-vino-100 px-3 py-2 text-sm" />
          <select name="planId" required defaultValue={afiliado.planId} className="w-full rounded-lg border border-vino-100 px-3 py-2 text-sm">
            {planes.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
          <select name="vereda" value={veredaSeleccionada} onChange={(e) => setVeredaSeleccionada(e.target.value)} className="w-full rounded-lg border border-vino-100 px-3 py-2 text-sm">
            <option value="">Vereda (opcional)…</option>
            {(VEREDAS_POR_MUNICIPIO[afiliado.sede] ?? []).map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
          <label className="block text-xs text-tinta/50">Fecha de afiliación</label>
          <input name="fechaAfiliacionReal" type="date" required defaultValue={aInputDate(afiliado.fechaAfiliacionReal)} className="w-full rounded-lg border border-vino-100 px-3 py-2 text-sm" />
          <label className="block text-xs text-tinta/50">Fecha de nacimiento</label>
<input name="fechaNacimiento" type="date" required defaultValue={aInputDate(afiliado.fechaNacimiento)} className="w-full rounded-lg border border-vino-100 px-3 py-2 text-sm" />
<label className="block text-xs text-tinta/50">Cuota mensual que paga</label>
          <CampoPrecio name="valorCuotaMensual" required valorInicial={afiliado.valorCuotaMensual} placeholder="Cuota mensual" />
          <label className="flex items-center gap-2 text-sm text-tinta/70">
            <input type="checkbox" name="tieneSeguroVida" defaultChecked={afiliado.tieneSeguroVida} />
            Tiene seguro de vida
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={guardando} className="flex w-full items-center justify-center gap-2 rounded-lg bg-vino-700 py-2.5 text-sm font-medium text-white hover:bg-vino-600 disabled:opacity-60">
            <Save size={16} />
            {guardando ? "Guardando…" : "Guardar cambios"}
          </button>
        </form>
      </div>
    </div>
  );
}