import { useState, FormEvent } from "react";
import { X, Save } from "lucide-react";
import { actualizarAfiliado } from "../api/client";
import { formatoPesos } from "../utils/formato";
import type { Afiliado, PlanFunerario } from "../types";

interface Props {
  afiliado: Afiliado;
  planes: PlanFunerario[];
  onCerrar: () => void;
}

export default function PanelEditarAfiliado({ afiliado, planes, onCerrar }: Props) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
            {planes.map((p) => <option key={p.id} value={p.id}>{p.nombre} — {formatoPesos(p.valorMensual)}/mes</option>)}
          </select>
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