import type { ReactNode } from "react";
import { X } from "lucide-react";
import { useDialogo } from "../hooks/useDialogo";

/** Ventana emergente con el estilo de Planes y Convenios (título, cerrar con Escape o con la X). */
export default function Modal({
  titulo,
  antetitulo,
  onCerrar,
  ancho = "max-w-md",
  children,
}: {
  titulo: string;
  antetitulo?: string;
  onCerrar: () => void;
  ancho?: string;
  children: ReactNode;
}) {
  const refDialogo = useDialogo(onCerrar);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-tinta/40 p-4">
      <div ref={refDialogo} role="dialog" aria-modal="true" className={`max-h-[90vh] w-full ${ancho} overflow-y-auto rounded-2xl bg-white p-6 shadow-xl`}>
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            {antetitulo && <p className="text-xs font-medium uppercase tracking-wide text-vino-700">{antetitulo}</p>}
            <h2 className="font-display text-xl text-vino-900">{titulo}</h2>
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="rounded-lg p-1.5 text-tinta/70 hover:bg-vino-50 hover:text-tinta">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Botones de pie de formulario: Cancelar + Guardar. */
export function PieFormulario({ onCancelar, guardando, textoGuardar }: { onCancelar: () => void; guardando: boolean; textoGuardar: string }) {
  return (
    <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
      <button type="button" onClick={onCancelar} className="min-h-[44px] rounded-lg border border-vino-100 px-4 text-sm font-medium text-tinta/70 hover:bg-vino-50">
        Cancelar
      </button>
      <button type="submit" disabled={guardando} className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-vino-700 px-5 text-sm font-medium text-white transition hover:bg-vino-600 active:translate-y-px disabled:opacity-60">
        {guardando ? "Guardando…" : textoGuardar}
      </button>
    </div>
  );
}
