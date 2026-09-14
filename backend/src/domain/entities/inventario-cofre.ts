import { MetadataCambio } from "../value-objects/metadata-cambio";

export interface InventarioCofre {
  id: string; // determinístico: `${sede}_${tipoCofreId}`
  sede: string;
  tipoCofreId: string;
  cantidadDisponible: number;
  metadata: MetadataCambio;
}