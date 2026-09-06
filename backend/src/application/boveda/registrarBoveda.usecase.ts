import { Boveda } from "../../domain/entities/boveda";
import { MetadataCambio } from "../../domain/value-objects/metadata-cambio";
import { BovedaRepository } from "../ports/boveda.repository";

export interface RegistrarBovedaInput {
  servicioId: string;
  zona: string;
  fechaInicio: string;
  valorArriendo: number;
  incluyeExhumacion: boolean;
}

export async function registrarBoveda(
  repo: BovedaRepository,
  input: RegistrarBovedaInput,
  metadata: MetadataCambio
): Promise<Boveda> {
  const fechaInicio = new Date(input.fechaInicio);
  const fechaLimite = new Date(fechaInicio);
  fechaLimite.setFullYear(fechaLimite.getFullYear() + 4);

  return repo.crear({
    servicioId: input.servicioId,
    zona: input.zona,
    fechaInicio,
    fechaLimite,
    valorArriendo: input.valorArriendo,
    incluyeExhumacion: input.incluyeExhumacion,
    estado: "vigente",
    metadata,
  });
}