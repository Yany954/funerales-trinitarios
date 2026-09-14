import { PlanFunerario } from "../../domain/entities/plan-funerario";

export interface PlanesRepository {
  crear(plan: Omit<PlanFunerario, "id">): Promise<PlanFunerario>;
  listar(): Promise<PlanFunerario[]>;
}