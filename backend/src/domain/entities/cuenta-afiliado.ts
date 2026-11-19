import { Sede } from "../value-objects/rol-usuario";

/**
 * Vínculo entre un titular (documento en "afiliados") y su cuenta de la app.
 * Se guarda en "cuentas_afiliado/{afiliadoId}": un titular = una cuenta.
 * El PIN NO está aquí: vive solo en Firebase Auth, cifrado.
 */
export interface CuentaAfiliado {
  afiliadoId: string;
  uid: string;
  sede: Sede; // para que el staff de la sede pueda ver si ya tiene cuenta
  metodoVinculacion: "contrato" | "codigo";
  fechaCreacion: Date;
  /** Autorización de tratamiento de datos (Ley 1581 de 2012). */
  habeasData: {
    version: string;
    fechaAceptacion: Date;
  };
}

/**
 * Código de activación de un solo uso que genera el staff en el dashboard,
 * para titulares sin número de contrato (solo seguro de vida) o que lo perdieron.
 * Se guarda en "codigos_activacion/{afiliadoId}" — solo el hash, nunca el código.
 */
export interface CodigoActivacion {
  afiliadoId: string;
  hash: string;
  salt: string;
  expira: Date;
  usado: boolean;
  creadoPor: string; // uid del staff
  fechaCreacion: Date;
}

/** Intentos fallidos de registro por cédula, para frenar a quien intente adivinar. */
export interface IntentosRegistro {
  fallidos: number;
  bloqueadoHasta: Date | null;
}
