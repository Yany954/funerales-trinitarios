import { useState, FormEvent } from "react";
import { X, Save } from "lucide-react";
import { crearConvenio, actualizarConvenio } from "../api/client";
import type { Convenio } from "../types";

interface Props {
  convenio: Convenio | null; // null = creando uno nuevo
  onCerrar: () => void;
}

export default function ModalEditarConvenio({ convenio, onCerrar }: Props) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function manejarGuardar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    const form = new FormData(e.currentTarget);
    try {
      const datos = {
        nombre: String(form.get("nombre")),
        tipo: String(form.get("tipo")) as Convenio["tipo"],
        numeroContrato: String(form.get("numeroContrato") || "") || undefined,
        coberturaGeografica: String(form.get("coberturaGeografica") || "").split(",").map((s) => s.trim()).filter(Boolean),
      };
      if (convenio) {
        await actualizarConvenio({ id: convenio.id, ...datos });
      } else {
        await crearConvenio(datos);
      }
      onCerrar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el convenio.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-tinta/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg text-vino-900">{convenio ? `Editando: ${convenio.nombre}` : "Nuevo convenio"}</h3>
          <button onClick={onCerrar} className="text-tinta/40 hover:text-tinta"><X size={20} /></button>
        </div>
        <form onSubmit={manejarGuardar} className="space-y-3">
          <input name="nombre" required defaultValue={convenio?.nombre} placeholder="Nombre (ej. Recordar)" className="w-full rounded-lg border border-vino-100 px-3 py-2 text-sm" />
          <select name="tipo" required defaultValue={convenio?.tipo} className="w-full rounded-lg border border-vino-100 px-3 py-2 text-sm">
            <option value="">Tipo…</option>
            <option value="empresa_exequial">Empresa exequial</option>
            <option value="alcaldia">Alcaldía</option>
            <option value="interno">Interno (afiliados/particular)</option>
          </select>
          <input name="numeroContrato" defaultValue={convenio?.numeroContrato} placeholder="N° de contrato (solo alcaldías)" className="w-full rounded-lg border border-vino-100 px-3 py-2 text-sm" />
          <input name="coberturaGeografica" defaultValue={convenio?.coberturaGeografica?.join(", ")} placeholder="Municipios, separados por coma" className="w-full rounded-lg border border-vino-100 px-3 py-2 text-sm" />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={guardando} className="flex w-full items-center justify-center gap-2 rounded-lg bg-vino-700 py-2.5 text-sm font-medium text-white hover:bg-vino-600 disabled:opacity-60">
            <Save size={16} />
            {guardando ? "Guardando…" : convenio ? "Guardar cambios" : "Crear convenio"}
          </button>
        </form>
      </div>
    </div>
  );
}