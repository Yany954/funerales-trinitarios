import { MetadataCambio } from "../../domain/value-objects/metadata-cambio";
import { ConveniosRepository } from "../ports/convenios.repository";

export interface GuardarTarifaInput {
  convenioId: string;
  anio: string; // "2025", "2026"...
  servicioCompletoBasico: number;
  servicioCompletoSemilujo?: number;
  servicioCompletoLujo?: number;
  iniciales: number;
  finales: number;
  trasladoLocal: number;
  trasladoFluvial: number;
}

export async function guardarTarifa(
  repo: ConveniosRepository,
  input: GuardarTarifaInput,
  metadata: MetadataCambio
): Promise<void> {
  const { convenioId, ...datosTarifa } = input;
  await repo.guardarTarifa(convenioId, { ...datosTarifa, metadata });
}