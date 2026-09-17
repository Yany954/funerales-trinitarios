import { MetadataCambio } from "../value-objects/metadata-cambio";

export interface PlanFunerario {
  id: string;
  nombre: string;
  valorMensual: number;
  metadata: MetadataCambio;
}
export interface HistorialPrecioPlan {
  anio: string;
  valorMensual: number;
  metadata: MetadataCambio;
}