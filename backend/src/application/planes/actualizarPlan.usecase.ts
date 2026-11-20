import { PlanFunerario } from "../../domain/entities/plan-funerario";
import { MetadataCambio } from "../../domain/value-objects/metadata-cambio";
import { PlanesRepository } from "../ports/planes.repository";

export interface ActualizarPlanInput {
  id: string;
  nombre?: string;
  /** Un beneficio por elemento. [] = volver a los de la hoja. */
  beneficios?: string[];
}

export const MAX_BENEFICIOS = 60;
export const MAX_LARGO_BENEFICIO = 300;

export async function actualizarPlan(repo: PlanesRepository, input: ActualizarPlanInput, metadata: MetadataCambio): Promise<PlanFunerario> {
  const { id, beneficios, ...cambios } = input;
  const datos: Partial<Omit<PlanFunerario, "id">> = { ...cambios, metadata };
  if (beneficios !== undefined) {
    if (!Array.isArray(beneficios) || beneficios.some((b) => typeof b !== "string")) {
      throw new Error("Los beneficios deben ser una lista de textos.");
    }
    const limpios = beneficios.map((b) => b.trim()).filter(Boolean);
    if (limpios.length > MAX_BENEFICIOS) throw new Error(`Máximo ${MAX_BENEFICIOS} beneficios por plan.`);
    if (limpios.some((b) => b.length > MAX_LARGO_BENEFICIO)) throw new Error(`Cada beneficio puede tener máximo ${MAX_LARGO_BENEFICIO} letras.`);
    datos.beneficios = limpios;
  }
  return repo.actualizar(id, datos);
}