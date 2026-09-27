import { MetadataCambio } from "../value-objects/metadata-cambio";
import { Sede } from "../value-objects/rol-usuario";



export interface UltimoPago {
  fecha: Date;
  valor: number;
  metodo: string;
}

export interface Afiliado {
  id: string;
  nombreCompleto: string;
  cedula: string;
  numeroContrato: string;
  sede: Sede;
  vereda?: string;
  planId: string;
  fechaAfiliacionReal: Date;
  valorCuotaMensual: number;
  fechaNacimiento: Date;
  estadoPlan: "activo" | "inactivo" | "en mora";
  fechaAfiliacion: Date;
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
  nombreBusqueda: string;
  cedula: string;
  esTitular: boolean;
  parentesco?: string;
  afiliadoId: string;
}
export interface BeneficiarioEntrada {
  nombre: string;
  parentesco: string;
  cedula: string;
  fechaNacimiento?: string; 
}
export interface Beneficiario {
  nombre: string;
  parentesco: string;
  cedula: string;
  fechaAdicion: Date;
  fallecido?: boolean;
  fechaFallecimiento?: Date;
  fechaNacimiento?: Date;
  certificadoDefuncionURL?: string;
}