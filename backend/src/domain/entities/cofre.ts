import { MetadataCambio } from "../value-objects/metadata-cambio";

export type NivelCofre = "basico" | "semilujo" | "lujo";
export type CategoriaCofre = "estandar" | "ancho" | "infantil";

export interface TipoCofre {
  id: string;
  categoria: CategoriaCofre;
  nivel?: NivelCofre;
  tamanoCm?: number;
  referencia: string;
  fotoURL?: string;
  descripcion?: string;
  metadata: MetadataCambio;
  precio: number;
}