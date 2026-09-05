import { MetadataCambio } from "../value-objects/metadata-cambio";

export type Sede = "Pailitas" | "Tamalameque" | "Pelaya" | "Curumaní";
export type TipoServicio = "traslado" | "servicio completo" | "traslado + servicio completo";
export type TipoTraslado = "local" | "fluvial" | "ninguno";
export type EstadoFacturacion = "pendiente por facturar" | "facturado" | "pagado";

export interface ItemServicio {
  concepto: string;
  cantidad: number;
  valorUnitario: number;
  valorTotal: number;
}

export interface UsoBoveda {
  usada: boolean;
  fechaInicio?: Date;
  fechaLimite?: Date; // fechaInicio + 4 años
  zona?: string;
}

export interface Servicio {
  id: string;
  fechaServicio: Date;
  sede: Sede;
  convenioId: string; // apunta a convenios/{id} — incluye alcaldías, empresas exequiales, "Afiliados" y "Particular"
  afiliadoId?: string; // solo si el cliente es un afiliado
  fallecido: { nombreCompleto: string; cedula?: string };
  tipoServicio: TipoServicio;
  tipoTraslado: TipoTraslado;
  usoBoveda: UsoBoveda;
  tuvoMisaOCulto: "misa" | "culto" | "ninguno";
  registroDefuncionAdjuntoURL?: string;
  itemsServicio: ItemServicio[];
  valorTotal: number;
  estadoFacturacion: EstadoFacturacion;
  documentosAdjuntos: string[];
  observaciones?: string;
  metadata: MetadataCambio;
}
