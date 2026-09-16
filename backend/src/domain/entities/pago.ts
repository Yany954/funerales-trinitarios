import { MetadataCambio } from "../value-objects/metadata-cambio";

export interface Pago {
  id: string;
  afiliadoId: string;
  sede: string;
  fecha: Date;
  valor: number;
  periodoCubierto: string;
  comprobanteURL: string;
  metadata: MetadataCambio;
}