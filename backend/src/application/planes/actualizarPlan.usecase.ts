import { PlanFunerario } from "../../domain/entities/plan-funerario";
import { MetadataCambio } from "../../domain/value-objects/metadata-cambio";
import { PlanesRepository } from "../ports/planes.repository";

export interface ActualizarPlanInput {
  id: string;
  nombre?: string;
}

export async function actualizarPlan(repo: PlanesRepository, input: ActualizarPlanInput, metadata: MetadataCambio): Promise<PlanFunerario> {
  const { id, ...cambios } = input;
  return repo.actualizar(id, { ...cambios, metadata });
}