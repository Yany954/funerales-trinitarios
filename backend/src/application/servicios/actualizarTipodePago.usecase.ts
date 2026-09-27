import { Servicio } from "../../domain/entities/servicio";
import { MetadataCambio } from "../../domain/value-objects/metadata-cambio";
import { ServiciosRepository } from "../ports/servicios.repository";

export interface ActualizarTipoPagoInput {
  servicioId: string;
  tipoPago: NonNullable<Servicio["tipoPago"]>;
}

export async function actualizarTipoPago(
  repo: ServiciosRepository,
  input: ActualizarTipoPagoInput,
  metadata: MetadataCambio
): Promise<Servicio> {
  return repo.actualizar(input.servicioId, { tipoPago: input.tipoPago, metadata });
} 