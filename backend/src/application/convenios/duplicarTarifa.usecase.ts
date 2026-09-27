import { MetadataCambio } from "../../domain/value-objects/metadata-cambio";
import { ConveniosRepository } from "../ports/convenios.repository";

export interface DuplicarTarifaInput {
  convenioId: string;
  anioOrigen: string;
  anioDestino: string;
}

export async function duplicarTarifa(
  repo: ConveniosRepository,
  input: DuplicarTarifaInput,
  metadata: MetadataCambio
): Promise<void> {
  const tarifaOrigen = await repo.obtenerTarifa(input.convenioId, input.anioOrigen);
  if (!tarifaOrigen) throw new Error(`No existe ninguna tarifa ${input.anioOrigen} para ese convenio.`);

  await repo.guardarTarifa(input.convenioId, {
  anio: input.anioDestino,
  servicioCompletoBasico: tarifaOrigen.servicioCompletoBasico,
  servicioCompletoSemilujo: tarifaOrigen.servicioCompletoSemilujo,
  servicioCompletoLujo: tarifaOrigen.servicioCompletoLujo,
  iniciales: tarifaOrigen.iniciales,
  finales: tarifaOrigen.finales,
  trasladoLocal: tarifaOrigen.trasladoLocal,
  trasladoFluvial: tarifaOrigen.trasladoFluvial,
  precioCofre: tarifaOrigen.precioCofre,
  precioBoveda: tarifaOrigen.precioBoveda, 
  metadata,
});
}