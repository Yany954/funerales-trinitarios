import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { CuentasAfiliadoRepository } from "../ports/cuentas-afiliado.repository";
import { AfiliadosRepository } from "../ports/afiliados.repository";
import { CodigoActivacion } from "../../domain/entities/cuenta-afiliado";
import {
  ALFABETO_CODIGO,
  DIAS_VIGENCIA_CODIGO,
  LARGO_CODIGO_ACTIVACION,
  formatearCodigo,
  normalizarCodigo,
} from "../../domain/value-objects/cuenta-app";

function hashCodigo(codigo: string, salt: string): string {
  return createHash("sha256").update(`${salt}:${codigo}`).digest("hex");
}

/**
 * El staff genera un código de un solo uso para que el titular active su cuenta
 * en la app. Generar uno nuevo invalida el anterior. Se guarda solo el hash:
 * si alguien lee la base de datos, no puede sacar el código.
 */
export async function generarCodigoActivacion(
  cuentasRepo: CuentasAfiliadoRepository,
  afiliadosRepo: AfiliadosRepository,
  afiliadoId: string,
  uidStaff: string
): Promise<{ codigo: string; expira: Date }> {
  const afiliado = await afiliadosRepo.obtenerPorId(afiliadoId);
  if (!afiliado) throw new Error("Ese afiliado no existe.");
  if (!afiliado.cedula?.trim()) {
    throw new Error("Este titular no tiene cédula registrada. Agrégala primero: la app la pide para entrar.");
  }
  if (await cuentasRepo.obtenerCuenta(afiliadoId)) {
    throw new Error("Este titular ya tiene cuenta en la app. Si olvidó su PIN, usa \"Restablecer acceso\".");
  }

  const codigo = Array.from({ length: LARGO_CODIGO_ACTIVACION }, () => ALFABETO_CODIGO[randomInt(ALFABETO_CODIGO.length)]).join("");
  const salt = randomBytes(16).toString("hex");
  const expira = new Date(Date.now() + DIAS_VIGENCIA_CODIGO * 24 * 60 * 60 * 1000);
  const registro: CodigoActivacion = {
    afiliadoId,
    hash: hashCodigo(codigo, salt),
    salt,
    expira,
    usado: false,
    creadoPor: uidStaff,
    fechaCreacion: new Date(),
  };
  await cuentasRepo.guardarCodigo(registro);
  return { codigo: formatearCodigo(codigo), expira };
}

/** true si el código escrito es el vigente (sin usar y sin vencer) de ese afiliado. */
export async function codigoEsValido(
  cuentasRepo: CuentasAfiliadoRepository,
  afiliadoId: string,
  codigoEscrito: string
): Promise<boolean> {
  const registro = await cuentasRepo.obtenerCodigo(afiliadoId);
  if (!registro || registro.usado || registro.expira.getTime() < Date.now()) return false;
  const esperado = Buffer.from(registro.hash, "hex");
  const recibido = Buffer.from(hashCodigo(normalizarCodigo(codigoEscrito), registro.salt), "hex");
  return esperado.length === recibido.length && timingSafeEqual(esperado, recibido);
}
