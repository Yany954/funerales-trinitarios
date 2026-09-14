import { MetadataCambio } from "../value-objects/metadata-cambio";

export type NivelCofre = "basico" | "semilujo" | "lujo";

export interface TipoCofre {
  id: string;
  nivel: NivelCofre;
  referencia: string;
  fotoURL?: string;
  descripcion?: string;
  metadata: MetadataCambio;
}