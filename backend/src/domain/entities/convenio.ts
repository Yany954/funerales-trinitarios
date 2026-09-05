import { MetadataCambio } from "../value-objects/metadata-cambio";

export type TipoConvenio = "empresa_exequial" | "alcaldia" | "interno";

export interface Convenio {
  id: string;
  nombre: string;
  tipo: TipoConvenio;
  numeroContrato?: string;
  coberturaGeografica: string[];
  metadata: MetadataCambio;
}

export interface TarifaConvenio {
  /** ID del documento = el año, ej. "2026" */
  anio: string;
  servicioCompletoBasico: number;
  servicioCompletoSemilujo?: number;
  servicioCompletoLujo?: number;
  iniciales: number;
  finales: number;
  trasladoLocal: number;
  trasladoFluvial: number;
  metadata: MetadataCambio;
}
