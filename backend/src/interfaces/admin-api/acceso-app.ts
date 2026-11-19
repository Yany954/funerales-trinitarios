import { onCall } from "firebase-functions/v2/https";
import { AfiliadosRepositoryFirestore } from "../../infrastructure/firebase/afiliados.repository.firestore";
import { CuentasAfiliadoRepositoryFirestore } from "../../infrastructure/firebase/cuentas-afiliado.repository.firestore";
import { AuthAfiliadosAdmin } from "../../infrastructure/auth/auth-afiliados.admin";
import { generarCodigoActivacion } from "../../application/cuentas-afiliado/codigoActivacion";
import { restablecerAccesoApp } from "../../application/cuentas-afiliado/restablecerAccesoApp.usecase";
import { autorizar, ejecutar } from "./afiliados";

/** Acciones del staff sobre el acceso de un titular a la app móvil. */

const afiliadosRepo = new AfiliadosRepositoryFirestore();
const cuentasRepo = new CuentasAfiliadoRepositoryFirestore();
const auth = new AuthAfiliadosAdmin();

/** Código de un solo uso (vence en 7 días) para activar la cuenta sin número de contrato. */
export const generarCodigoActivacionFn = onCall<{ afiliadoId: string }>(async (request) => {
  const uid = await autorizar(request);
  const { codigo, expira } = await ejecutar(() => generarCodigoActivacion(cuentasRepo, afiliadosRepo, request.data.afiliadoId, uid));
  return { codigo, expira: expira.toISOString() };
});

/** Borra la cuenta de la app (olvidó el PIN); el titular vuelve a registrarse. */
export const restablecerAccesoAppFn = onCall<{ afiliadoId: string }>(async (request) => {
  await autorizar(request);
  await ejecutar(() => restablecerAccesoApp(cuentasRepo, auth, request.data.afiliadoId));
  return { ok: true };
});
