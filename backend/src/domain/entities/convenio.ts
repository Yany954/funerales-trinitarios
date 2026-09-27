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
  anio: string;
  servicioCompletoBasico?: number;
  servicioCompletoSemilujo?: number;
  servicioCompletoLujo?: number;
  iniciales?: number;
  finales?: number;
  trasladoLocal?: number;
  trasladoFluvial?: number;
  precioCofre?: number;
  precioBoveda?: number;
  metadata: MetadataCambio;
}
