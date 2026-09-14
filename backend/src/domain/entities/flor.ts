import { MetadataCambio } from "../value-objects/metadata-cambio";

export interface Flor {
  id: string;
  nombre: string;
  fotoURL?: string;
  precioCosto: number;
  precioPublico: number;
  metadata: MetadataCambio;
}