import { MetadataCambio } from "../value-objects/metadata-cambio";

export interface PlanFunerario {
  id: string;
  nombre: string;
  valorMensual: number;
  /** Beneficios editados en el dashboard. Vacío = se usan los de la hoja (beneficios-plan.ts). */
  beneficios?: string[];
  metadata: MetadataCambio;
}
export interface HistorialPrecioPlan {
  anio: string;
  valorMensual: number;
  metadata: MetadataCambio;
}