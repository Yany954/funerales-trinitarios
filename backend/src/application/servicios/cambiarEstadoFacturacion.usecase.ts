import { Servicio } from "../../domain/entities/servicio";
import { Convenio } from "../../domain/entities/convenio";
import { MetadataCambio } from "../../domain/value-objects/metadata-cambio";
import { ServiciosRepository } from "../ports/servicios.repository";
import { ConveniosRepository } from "../ports/convenios.repository";

export interface CambiarEstadoFacturacionInput {
  servicioId: string;
  nuevoEstado: "facturado" | "pagado";
  facturaURL?: string;
  comprobantePagoURL?: string;
}

export function requiereFactura(convenio: Convenio | null): boolean {
  return convenio?.tipo !== "alcaldia";
}

export function requiereComprobantePago(servicio: Servicio, convenio: Convenio | null): boolean {
  if (convenio?.tipo === "alcaldia") return false;
  if (servicio.afiliadoId && servicio.valorTotal === 0) return false; // el plan ya cubrió todo
  return true;
}

export async function cambiarEstadoFacturacion(
  serviciosRepo: ServiciosRepository,
  conveniosRepo: ConveniosRepository,
  input: CambiarEstadoFacturacionInput,
  metadata: MetadataCambio
): Promise<Servicio> {
  const servicio = await serviciosRepo.obtenerPorId(input.servicioId);
  if (!servicio) throw new Error("Ese servicio no existe.");

  const convenio = servicio.convenioId ? await conveniosRepo.obtenerPorId(servicio.convenioId) : null;

  if (input.nuevoEstado === "facturado") {
    if (servicio.estadoFacturacion !== "pendiente por facturar") {
      throw new Error("Este servicio ya no está pendiente por facturar.");
    }
    if (requiereFactura(convenio) && !input.facturaURL) {
      throw new Error("Adjunta la factura remitida antes de marcarlo como facturado.");
    }
  }

  if (input.nuevoEstado === "pagado") {
    if (servicio.estadoFacturacion !== "facturado") {
      throw new Error("Primero debes marcarlo como facturado.");
    }
    if (requiereComprobantePago(servicio, convenio) && !input.comprobantePagoURL) {
      throw new Error("Adjunta el comprobante de pago antes de marcarlo como pagado.");
    }
  }

  const cambios: Partial<Omit<Servicio, "id">> = { estadoFacturacion: input.nuevoEstado, metadata };
  if (input.facturaURL) cambios.facturaURL = input.facturaURL;
  if (input.comprobantePagoURL) cambios.comprobantePagoURL = input.comprobantePagoURL;

  return serviciosRepo.actualizar(input.servicioId, cambios);
}