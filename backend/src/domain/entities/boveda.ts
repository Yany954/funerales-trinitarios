import { MetadataCambio } from "../value-objects/metadata-cambio";
import { Sede } from "../value-objects/rol-usuario";

export type EstadoBoveda = "vigente" | "por vencer" | "vencida";

export interface Boveda {
  id: string;
  servicioId?: string;
  sede: Sede;
  zona: string;
  fechaInicio: Date;
  fechaLimite: Date;
  valorArriendo: number;
  incluyeExhumacion: boolean;
  estado: EstadoBoveda;
  metadata: MetadataCambio;
}