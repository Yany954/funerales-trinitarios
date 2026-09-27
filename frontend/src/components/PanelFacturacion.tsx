import { useState } from "react";
import { X, FileCheck } from "lucide-react";
import { cambiarEstadoFacturacion } from "../api/client";
import SubirDocumento from "./SubirDocumento";
import SubirFoto from "./SubirFoto";
import { formatoPesos } from "../utils/formato";
import type { Servicio, Convenio } from "../types";

interface Props {
  servicio: Servicio;
  convenio: Convenio | null;
  onCerrar: () => void;
}

export default function PanelFacturacion({ servicio, convenio, onCerrar }: Props) {
  const [facturaURL, setFacturaURL] = useState<string[]>([]);
  const [comprobanteURL, setComprobanteURL] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const siguienteEstado = servicio.estadoFacturacion === "pendiente por facturar" ? "facturado" : "pagado";

  async function confirmar() {
    setError(null);
    setGuardando(true);
    try {
      await cambiarEstadoFacturacion({
        servicioId: servicio.id,
        nuevoEstado: siguienteEstado,
        facturaURL: facturaURL[0],
        comprobantePagoURL: comprobanteURL || undefined,
      });
      onCerrar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el estado.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-tinta/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg text-vino-900">Marcar como {siguienteEstado}</h3>
          <button onClick={onCerrar} className="text-tinta/40 hover:text-tinta"><X size={20} /></button>
        </div>
        <p className="mb-3 text-sm text-tinta/60">
          {servicio.fallecido.nombreCompleto} — {formatoPesos(servicio.valorTotal)}
          {convenio && ` — ${convenio.nombre}`}
        </p>

        {siguienteEstado === "facturado" ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-vino-900">Factura remitida (opcional)</p>
            <SubirDocumento carpeta={`servicios/${servicio.sede}/${servicio.id}`} documentos={facturaURL} onCambiar={setFacturaURL} />
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium text-vino-900">Comprobante de pago (opcional)</p>
            <SubirFoto carpeta={`servicios/${servicio.sede}/${servicio.id}`} onSubido={setComprobanteURL} />
          </div>
        )}

        <p className="mt-2 flex items-center gap-1.5 text-xs text-tinta/50">
          <FileCheck size={13} />
          Puedes subir el archivo ahora o dejarlo para después — no es obligatorio para cambiar el estado.
        </p>

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <button onClick={confirmar} disabled={guardando} className="mt-4 w-full rounded-lg bg-vino-700 py-2.5 text-sm font-medium text-white hover:bg-vino-600 disabled:opacity-60">
          {guardando ? "Guardando…" : `Confirmar: marcar como ${siguienteEstado}`}
        </button>
      </div>
    </div>
  );
}