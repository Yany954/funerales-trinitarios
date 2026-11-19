import { CodigoActivacion, CuentaAfiliado, IntentosRegistro } from "../../domain/entities/cuenta-afiliado";
import { ClaimsAfiliado } from "../../domain/value-objects/rol-usuario";

/** Puerto: vínculos, códigos de activación e intentos fallidos (Firestore). */
export interface CuentasAfiliadoRepository {
  obtenerCuenta(afiliadoId: string): Promise<CuentaAfiliado | null>;
  /** Reserva el vínculo; lanza error si ya existe (evita dos registros a la vez). */
  reservarCuenta(cuenta: Omit<CuentaAfiliado, "uid">): Promise<void>;
  confirmarCuenta(afiliadoId: string, uid: string): Promise<void>;
  eliminarCuenta(afiliadoId: string): Promise<void>;

  guardarCodigo(codigo: CodigoActivacion): Promise<void>;
  obtenerCodigo(afiliadoId: string): Promise<CodigoActivacion | null>;
  marcarCodigoUsado(afiliadoId: string): Promise<void>;

  obtenerIntentos(cedula: string): Promise<IntentosRegistro>;
  guardarIntentos(cedula: string, intentos: IntentosRegistro): Promise<void>;
  limpiarIntentos(cedula: string): Promise<void>;
}

/** Puerto: cuentas de Firebase Auth de los afiliados (correo interno + PIN). */
export interface AuthAfiliadosService {
  /** uid y claims de la cuenta que tenga ese correo, o null si no hay. */
  buscarPorCorreo(correo: string): Promise<{ uid: string; claims: Record<string, unknown> } | null>;
  crear(correo: string, pin: string, nombre: string, claims: ClaimsAfiliado): Promise<string>;
  eliminar(uid: string): Promise<void>;
}
