import { Boveda } from "../../domain/entities/boveda";
import { MetadataCambio } from "../../domain/value-objects/metadata-cambio";
import { BovedaRepository } from "../ports/boveda.repository";

export interface RegistrarBovedaInput {
  servicioId: string;
  zona: string;
  fechaInicio: Date;
  valorArriendo: number;
  incluyeExhumacion: boolean;
}

export async function registrarBoveda(
  repo: BovedaRepository,
  input: RegistrarBovedaInput,
  metadata: MetadataCambio
): Promise<Boveda> {
  return await repo.crear(
    input.servicioId,
    input.zona,
    input.fechaInicio,
    input.valorArriendo,
    input.incluyeExhumacion,
    metadata
  );
}