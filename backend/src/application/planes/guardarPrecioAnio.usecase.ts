import { MetadataCambio } from "../../domain/value-objects/metadata-cambio";
import { PlanesRepository } from "../ports/planes.repository";

export interface GuardarPrecioAnioInput {
  planId: string;
  anio: string;
  valorMensual: number;
}

export async function guardarPrecioAnio(repo: PlanesRepository, input: GuardarPrecioAnioInput, metadata: MetadataCambio): Promise<void> {
  await repo.guardarPrecioAnio(input.planId, input.anio, input.valorMensual, metadata);
}