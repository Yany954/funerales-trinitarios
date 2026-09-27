import { MetadataCambio } from "../value-objects/metadata-cambio";

export interface ItemBoveda {
  id: string;
  nombre: string;
  zona: string;
  precio: number;
  metadata: MetadataCambio;
}