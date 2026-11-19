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
  ubicacion?: string; // vacía = la misma sede
  planId: string;
  fechaAfiliacionReal: Date;
  valorCuotaMensual: number;
  fechaNacimiento?: Date;
  estadoPlan: "activo" | "inactivo" | "en mora";
  fechaAfiliacion: Date;
  beneficiarios: Beneficiario[];
  ultimoPago: UltimoPago | null;
  tieneSeguroVida: boolean;
  aseguradora?: string;
  seguroVida?: SeguroVida;
  /** Titular que solo tiene seguro de vida (sin plan exequial): no aparece en Afiliados ni en la búsqueda de cubiertos. */
  soloSeguro?: boolean;
  observaciones?: string;
  periodoCubiertoHasta?: string | null;
  /** Celular de contacto (lo agrega el titular en la app o el staff en el dashboard). */
  celular?: string;
  /** Foto de perfil que sube el titular desde la app. */
  fotoPerfilURL?: string;
  /** Fotos del contrato físico, subidas por el staff desde el dashboard. */
  contratoFotos?: string[];
  metadata: MetadataCambio;
}

/** Beneficiario del seguro de vida (hasta 10, independientes de los del plan). */
export interface BeneficiarioSeguro {
  nombre: string;
  parentesco: string;
  cedula?: string;
  edad?: number; // opcional, sin límite
  porcentaje: number; // parte de la indemnización; entre todos suman 100
}

/** Seguro de vida: lo paga el titular, aparte de la cuota del plan, con sus propios pagos. */
export interface SeguroVida {
  precioMensual: number;
  valorIndemnizacion: number;
  beneficiarios: BeneficiarioSeguro[];
  fechaInicio: Date; // fecha de inicio de vigencia; marca el día de corte de cada mes
  estado: "activo" | "en mora";
  periodoCubiertoHasta?: string | null;
  ultimoPago?: UltimoPago | null;
}

/** Documento indexado en personas_cubiertas — un registro por titular + uno por cada beneficiario. */
export interface PersonaCubierta {
  id: string;
  nombreCompleto: string;
  nombreBusqueda: string;
  palabrasNombre: string[];
  cedula: string;
  cedulaBusqueda?: string; // cédula sin puntos/espacios, para buscar
  esTitular: boolean;
  parentesco?: string;
  afiliadoId: string;
}
export interface BeneficiarioEntrada {
  nombre: string;
  parentesco: string;
  cedula: string;
  fechaNacimiento?: string;
  adicional?: boolean; // pagó $10.000/mes aparte del plan por superar el cupo
}
export interface Beneficiario {
  nombre: string;
  parentesco: string;
  cedula: string;
  fechaAdicion: Date;
  fallecido?: boolean;
  fechaFallecimiento?: Date;
  fechaNacimiento?: Date;
  adicional?: boolean; // no ocupa cupo; suma $10.000 a la cuota mientras esté activo
  novedades?: NovedadBeneficiario[];
  certificadoDefuncionURL?: string;
}

export interface NovedadBeneficiario {
  tipo: "ingreso" | "retiro";
  fecha: Date;
  motivo?: string;
}