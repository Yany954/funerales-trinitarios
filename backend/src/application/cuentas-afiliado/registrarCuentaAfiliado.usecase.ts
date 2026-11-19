import { AfiliadosRepository } from "../ports/afiliados.repository";
import { AuthAfiliadosService, CuentasAfiliadoRepository } from "../ports/cuentas-afiliado.repository";
import { Afiliado } from "../../domain/entities/afiliado";
import { normalizarCedula } from "../../domain/value-objects/cedula";
import {
  MAX_INTENTOS_FALLIDOS,
  MINUTOS_BLOQUEO,
  correoInternoAfiliado,
  normalizarContrato,
  problemaDelPin,
} from "../../domain/value-objects/cuenta-app";
import { ROL_AFILIADO } from "../../domain/value-objects/rol-usuario";
import { codigoEsValido } from "./codigoActivacion";

export interface RegistrarCuentaAfiliadoInput {
  cedula: string;
  /** Titular con plan exequial: el número de su contrato. */
  numeroContrato?: string;
  /** Titular sin contrato (solo seguro) o que lo perdió: el código que le dio la sede. */
  codigoActivacion?: string;
  pin: string;
  aceptaHabeasData: boolean;
  versionHabeasData: string;
}

/** Error que se puede mostrar tal cual al afiliado. */
export class ErrorRegistro extends Error {}

// Mismo mensaje si la cédula no existe o si el contrato/código no coincide:
// así nadie puede usar la app para averiguar quién está afiliado.
const DATOS_NO_COINCIDEN = "Los datos no coinciden con nuestros registros. Revisa tu cédula y tu número de contrato o código.";

/**
 * El titular crea su cuenta en la app.
 * 1) Busca al titular por cédula. 2) Verifica el segundo dato (contrato o código).
 * 3) Crea la cuenta de Auth con el PIN como contraseña y el rol "afiliado".
 */
export async function registrarCuentaAfiliado(
  afiliadosRepo: AfiliadosRepository,
  cuentasRepo: CuentasAfiliadoRepository,
  auth: AuthAfiliadosService,
  input: RegistrarCuentaAfiliadoInput
): Promise<void> {
  const cedula = normalizarCedula(input.cedula);
  if (cedula.length < 5) throw new ErrorRegistro("Escribe tu número de cédula completo.");
  if (!input.aceptaHabeasData || !input.versionHabeasData) {
    throw new ErrorRegistro("Debes aceptar la autorización de tratamiento de datos para usar la app.");
  }
  const problemaPin = problemaDelPin(input.pin ?? "");
  if (problemaPin) throw new ErrorRegistro(problemaPin);
  const contrato = normalizarContrato(input.numeroContrato);
  const codigo = (input.codigoActivacion ?? "").trim();
  if (!contrato && !codigo) {
    throw new ErrorRegistro("Escribe tu número de contrato, o el código que te dieron en la sede.");
  }

  // ---- Freno a quien intente adivinar contratos o códigos ----
  const intentos = await cuentasRepo.obtenerIntentos(cedula);
  if (intentos.bloqueadoHasta && intentos.bloqueadoHasta.getTime() > Date.now()) {
    throw new ErrorRegistro(`Demasiados intentos. Espera ${MINUTOS_BLOQUEO} minutos o acércate a tu sede.`);
  }
  async function fallar(): Promise<never> {
    const fallidos = (intentos.bloqueadoHasta ? 0 : intentos.fallidos) + 1;
    const bloquear = fallidos >= MAX_INTENTOS_FALLIDOS;
    await cuentasRepo.guardarIntentos(cedula, {
      fallidos: bloquear ? 0 : fallidos,
      bloqueadoHasta: bloquear ? new Date(Date.now() + MINUTOS_BLOQUEO * 60 * 1000) : null,
    });
    throw new ErrorRegistro(DATOS_NO_COINCIDEN);
  }

  // ---- ¿Quién es? ----
  const candidatos = await afiliadosRepo.buscarTitularesPorCedula(input.cedula);
  const coinciden: Afiliado[] = [];
  for (const a of candidatos) {
    if (codigo && (await codigoEsValido(cuentasRepo, a.id, codigo))) {
      coinciden.push(a);
    } else if (contrato && !a.soloSeguro && normalizarContrato(a.numeroContrato) === contrato) {
      coinciden.push(a);
    }
  }
  if (coinciden.length === 0) return fallar();
  if (coinciden.length > 1) {
    throw new ErrorRegistro("Encontramos más de un registro con tu cédula. Acércate a tu sede para revisarlo.");
  }
  const afiliado = coinciden[0];
  const metodo = codigo && !(contrato && normalizarContrato(afiliado.numeroContrato) === contrato) ? "codigo" : "contrato";

  if (await cuentasRepo.obtenerCuenta(afiliado.id)) {
    throw new ErrorRegistro("Ya existe una cuenta con esta cédula. Si olvidaste tu PIN, pide en tu sede que restablezcan tu acceso.");
  }

  // El correo interno sale de la cédula: si ya lo usa la cuenta válida de OTRO
  // titular con la misma cédula (dato duplicado), no se puede pisar.
  const correo = correoInternoAfiliado(cedula);
  const existente = await auth.buscarPorCorreo(correo);
  const otroAfiliadoId = existente?.claims.rol === ROL_AFILIADO ? String(existente.claims.afiliadoId ?? "") : "";
  if (otroAfiliadoId && otroAfiliadoId !== afiliado.id && (await cuentasRepo.obtenerCuenta(otroAfiliadoId))) {
    throw new ErrorRegistro("Tu cédula ya está vinculada a otra afiliación. Acércate a tu sede para revisarlo.");
  }

  // ---- Crear la cuenta ----
  // 1) Reservar el vínculo primero: si dos registros llegan a la vez, solo uno gana.
  await cuentasRepo.reservarCuenta({
    afiliadoId: afiliado.id,
    sede: afiliado.sede,
    metodoVinculacion: metodo,
    fechaCreacion: new Date(),
    habeasData: { version: input.versionHabeasData, fechaAceptacion: new Date() },
  });

  try {
    // Una cuenta con ese correo que no tiene vínculo válido (alguien la creó a
    // mano sin pasar por aquí, o quedó huérfana): se borra para que no le
    // "robe" la cuenta al titular.
    if (existente) await auth.eliminar(existente.uid);

    const uid = await auth.crear(correo, input.pin, afiliado.nombreCompleto, {
      rol: ROL_AFILIADO,
      afiliadoId: afiliado.id,
    });
    await cuentasRepo.confirmarCuenta(afiliado.id, uid);
  } catch (err) {
    await cuentasRepo.eliminarCuenta(afiliado.id); // no dejar un vínculo a medias
    throw err;
  }

  if (metodo === "codigo") await cuentasRepo.marcarCodigoUsado(afiliado.id);
  await cuentasRepo.limpiarIntentos(cedula);
}
