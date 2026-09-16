import { useState } from "react";
import { X, FileCheck, Receipt } from "lucide-react";
import { cambiarEstadoFacturacion } from "../api/client";
import SubirDocumento from "./SubirDocumento";
import SubirFoto from "./SubirFoto";
import { requiereFactura, requiereComprobantePago } from "../utils/facturacion";
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
  const necesitaFactura = siguienteEstado === "facturado" && requiereFactura(convenio);
  const necesitaComprobante = siguienteEstado === "pagado" && requiereComprobantePago(servicio, convenio);

  async function confirmar() {
    setError(null);
    if (necesitaFactura && facturaURL.length === 0) {
      setError("Adjunta la factura remitida antes de continuar.");
      return;
    }
    if (necesitaComprobante && !comprobanteURL) {
      setError("Adjunta el comprobante de pago antes de continuar.");
      return;
    }
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
        <p className="mb-3 text-sm text-tinta/60">{servicio.fallecido.nombreCompleto} — {formatoPesos(servicio.valorTotal)}</p>

        {siguienteEstado === "facturado" && (
          necesitaFactura ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-vino-900">Factura remitida (foto o PDF)</p>
              <SubirDocumento carpeta={`servicios/${servicio.sede}/${servicio.id}`} documentos={facturaURL} onCambiar={setFacturaURL} />
            </div>
          ) : (
            <p className="rounded-lg bg-vino-50 p-3 text-sm text-vino-700">
              <FileCheck size={14} className="mr-1 inline" />
              Convenio con Alcaldía — no necesita factura individual, se factura en el reporte mensual.
            </p>
          )
        )}

        {siguienteEstado === "pagado" && (
          necesitaComprobante ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-vino-900">Comprobante de pago (foto o galería)</p>
              <SubirFoto carpeta={`servicios/${servicio.sede}/${servicio.id}`} onSubido={setComprobanteURL} />
            </div>
          ) : (
            <p className="rounded-lg bg-vino-50 p-3 text-sm text-vino-700">
              <Receipt size={14} className="mr-1 inline" />
              {convenio?.tipo === "alcaldia"
                ? "Convenio con Alcaldía — se paga en bloque junto con el reporte mensual."
                : "El plan del afiliado ya cubre este servicio por completo."}
            </p>
          )
        )}

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <button onClick={confirmar} disabled={guardando} className="mt-4 w-full rounded-lg bg-vino-700 py-2.5 text-sm font-medium text-white hover:bg-vino-600 disabled:opacity-60">
          {guardando ? "Guardando…" : `Confirmar: marcar como ${siguienteEstado}`}
        </button>
      </div>
    </div>
  );
}