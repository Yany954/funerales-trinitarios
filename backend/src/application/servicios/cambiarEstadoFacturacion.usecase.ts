import { Servicio } from "../../domain/entities/servicio";
import { MetadataCambio } from "../../domain/value-objects/metadata-cambio";
import { ServiciosRepository } from "../ports/servicios.repository";

export interface CambiarEstadoFacturacionInput {
  servicioId: string;
  nuevoEstado: Servicio["estadoFacturacion"];
  facturaURL?: string;
  comprobantePagoURL?: string;
}

const ORDEN: Servicio["estadoFacturacion"][] = ["pendiente por facturar", "facturado", "pagado"];

export async function cambiarEstadoFacturacion(
  serviciosRepo: ServiciosRepository,
  input: CambiarEstadoFacturacionInput,
  metadata: MetadataCambio
): Promise<Servicio> {
  const servicio = await serviciosRepo.obtenerPorId(input.servicioId);
  if (!servicio) throw new Error("Ese servicio no existe.");

  const posicionActual = ORDEN.indexOf(servicio.estadoFacturacion);
  const posicionNueva = ORDEN.indexOf(input.nuevoEstado);
  const diferencia = posicionNueva - posicionActual;

  // Solo se permite avanzar o retroceder UN paso a la vez — nunca saltar
  // directo de "pendiente" a "pagado", ni en un sentido ni en el otro.
  if (Math.abs(diferencia) !== 1) {
    throw new Error("Solo puedes avanzar o retroceder un paso a la vez en el estado de facturación.");
  }

  const cambios: Partial<Omit<Servicio, "id">> = { estadoFacturacion: input.nuevoEstado, metadata };
  if (input.facturaURL) cambios.facturaURL = input.facturaURL;
  if (input.comprobantePagoURL) cambios.comprobantePagoURL = input.comprobantePagoURL;

  return serviciosRepo.actualizar(input.servicioId, cambios);
}