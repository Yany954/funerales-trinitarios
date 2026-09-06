import { MetadataCambio } from "../value-objects/metadata-cambio";

export type EstadoBoveda = "vigente" | "por vencer" | "vencida";

export interface Boveda {
  id: string;
  servicioId: string;
  zona: string;
  fechaInicio: Date;
  fechaLimite: Date;
  valorArriendo: number;
  incluyeExhumacion: boolean;
  estado: EstadoBoveda;
  metadata: MetadataCambio;
}