import { MetadataCambio } from "../value-objects/metadata-cambio";
import { Sede } from "../value-objects/rol-usuario";

export interface Beneficiario {
  nombre: string;
  parentesco: string;
  cedula: string;
}

export interface UltimoPago {
  fecha: Date;
  valor: number;
  metodo: string;
}

export interface Afiliado {
  id: string;
  nombreCompleto: string;
  cedula: string;
  /** Referencia a planes_funerarios/{id} — Girasol, Alianza, Bendiciones, Integral */
  planId: string;
  estadoPlan: "activo" | "inactivo" | "en mora";
  fechaAfiliacion: Date;
  sede: Sede;
  beneficiarios: Beneficiario[];
  ultimoPago: UltimoPago | null;
  tieneSeguroVida: boolean;
  aseguradora?: string;
  observaciones?: string;
  metadata: MetadataCambio;
}

/** Documento indexado en personas_cubiertas — un registro por titular + uno por cada beneficiario. */
export interface PersonaCubierta {
  id: string;
  nombreCompleto: string;
  /** nombreCompleto en minúsculas, para poder buscar sin importar mayúsculas/acentos de tipeo. */
  nombreBusqueda: string;
  cedula: string;
  esTitular: boolean;
  parentesco?: string;
  afiliadoId: string;
}
