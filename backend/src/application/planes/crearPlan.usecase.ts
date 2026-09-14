import { PlanFunerario } from "../../domain/entities/plan-funerario";
import { MetadataCambio } from "../../domain/value-objects/metadata-cambio";
import { PlanesRepository } from "../ports/planes.repository";

export interface CrearPlanInput {
  nombre: string;
  valorMensual: number;
}

export async function crearPlan(
  repo: PlanesRepository,
  input: CrearPlanInput,
  metadata: MetadataCambio
): Promise<PlanFunerario> {
  return repo.crear({ ...input, metadata });
}