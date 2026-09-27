
import { MetadataCambio } from "../../domain/value-objects/metadata-cambio";
import { ConveniosRepository } from "../ports/convenios.repository";

export interface GuardarTarifaInput {
  convenioId: string;
  anio: string;
  servicioCompletoBasico?: number;
  servicioCompletoSemilujo?: number;
  servicioCompletoLujo?: number;
  iniciales?: number;
  finales?: number;
  trasladoLocal?: number;
  trasladoFluvial?: number;
  precioCofre?: number;
  precioBoveda?: number;
}

export async function guardarTarifa(
  repo: ConveniosRepository,
  input: GuardarTarifaInput,
  metadata: MetadataCambio
): Promise<void> {
  const { convenioId, ...datosTarifa } = input;
  await repo.guardarTarifa(convenioId, { ...datosTarifa, metadata });
}