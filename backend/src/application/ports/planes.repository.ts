import { PlanFunerario } from "../../domain/entities/plan-funerario";

export interface PlanesRepository {
  crear(plan: Omit<PlanFunerario, "id">): Promise<PlanFunerario>;
  listar(): Promise<PlanFunerario[]>;
  actualizar(id: string, cambios: Partial<Omit<PlanFunerario, "id">>): Promise<PlanFunerario>;
  guardarPrecioAnio(planId: string, anio: string, valorMensual: number, metadata: import("../../domain/value-objects/metadata-cambio").MetadataCambio): Promise<void>;
}