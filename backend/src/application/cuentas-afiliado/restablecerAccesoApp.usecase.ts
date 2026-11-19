import { AuthAfiliadosService, CuentasAfiliadoRepository } from "../ports/cuentas-afiliado.repository";

/**
 * El titular olvidó su PIN (o cambió de celular y no lo recuerda).
 * El staff no puede ver ni poner el PIN: borra la cuenta de la app y el titular
 * vuelve a registrarse (con su contrato o con un código nuevo) y crea otro PIN.
 * No toca el documento del afiliado ni sus pagos.
 */
export async function restablecerAccesoApp(
  cuentasRepo: CuentasAfiliadoRepository,
  auth: AuthAfiliadosService,
  afiliadoId: string
): Promise<void> {
  const cuenta = await cuentasRepo.obtenerCuenta(afiliadoId);
  if (!cuenta) throw new Error("Este titular no tiene cuenta en la app.");
  if (cuenta.uid) await auth.eliminar(cuenta.uid);
  await cuentasRepo.eliminarCuenta(afiliadoId);
}
