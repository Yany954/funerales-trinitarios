import { useState, FormEvent } from "react";
import { useDialogo } from "../hooks/useDialogo";
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

  const refDialogo = useDialogo(onCerrar);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-tinta/40 p-4">
      <div ref={refDialogo} role="dialog" aria-modal="true" className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-start justify-between">
          <h2 className="font-display text-xl text-vino-900">{convenio ? "Editar convenio" : "Nuevo convenio"}</h2>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="rounded-lg p-1.5 text-tinta/70 hover:bg-vino-50 hover:text-tinta">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <form onSubmit={manejarGuardar} className="space-y-4">
          <div>
            <label htmlFor="conv-nombre" className="mb-1 block text-sm font-medium">Nombre</label>
            <input id="conv-nombre" name="nombre" required defaultValue={convenio?.nombre} placeholder="Ej. Recordar" className="w-full rounded-lg border border-vino-100 px-3 py-2 text-sm" />
          </div>
          <div>
            <label htmlFor="conv-tipo" className="mb-1 block text-sm font-medium">Tipo</label>
            <select id="conv-tipo" name="tipo" required defaultValue={convenio?.tipo ?? ""} className="w-full rounded-lg border border-vino-100 px-3 py-2 text-sm">
              <option value="" disabled>Elige el tipo…</option>
              <option value="empresa_exequial">Empresa exequial</option>
              <option value="alcaldia">Alcaldía</option>
              <option value="interno">Interno (afiliados / particular)</option>
            </select>
          </div>
          <div>
            <label htmlFor="conv-contrato" className="mb-1 block text-sm font-medium">
              N° de contrato <span className="font-normal text-tinta/70">(opcional, alcaldías)</span>
            </label>
            <input id="conv-contrato" name="numeroContrato" defaultValue={convenio?.numeroContrato} className="w-full rounded-lg border border-vino-100 px-3 py-2 text-sm" />
          </div>
          <div>
            <label htmlFor="conv-cobertura" className="mb-1 block text-sm font-medium">Municipios que cubre</label>
            <input
              id="conv-cobertura"
              name="coberturaGeografica"
              defaultValue={convenio?.coberturaGeografica?.join(", ")}
              placeholder="Ej. Pailitas, Pelaya"
              aria-describedby="conv-cobertura-ayuda"
              className="w-full rounded-lg border border-vino-100 px-3 py-2 text-sm"
            />
            <p id="conv-cobertura-ayuda" className="mt-1 text-xs text-tinta/70">Separados por coma.</p>
          </div>
          {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onCerrar} className="min-h-[44px] rounded-lg border border-vino-100 px-4 text-sm font-medium text-tinta/70 hover:bg-vino-50">
              Cancelar
            </button>
            <button type="submit" disabled={guardando} className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-vino-700 px-5 text-sm font-medium text-white transition hover:bg-vino-600 active:translate-y-px disabled:opacity-60">
              <Save size={16} aria-hidden="true" />
              {guardando ? "Guardando…" : convenio ? "Guardar cambios" : "Crear convenio"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}