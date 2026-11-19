import { onCall, HttpsError } from "firebase-functions/v2/https";
import { AfiliadosRepositoryFirestore } from "../../infrastructure/firebase/afiliados.repository.firestore";
import { CuentasAfiliadoRepositoryFirestore } from "../../infrastructure/firebase/cuentas-afiliado.repository.firestore";
import { AuthAfiliadosAdmin } from "../../infrastructure/auth/auth-afiliados.admin";
import {
  ErrorRegistro,
  registrarCuentaAfiliado,
  RegistrarCuentaAfiliadoInput,
} from "../../application/cuentas-afiliado/registrarCuentaAfiliado.usecase";

/**
 * Callables que usa la app móvil de afiliados (no el dashboard).
 * Separadas de admin-api: aquí nadie tiene rol de staff.
 */

const afiliadosRepo = new AfiliadosRepositoryFirestore();
const cuentasRepo = new CuentasAfiliadoRepositoryFirestore();
const auth = new AuthAfiliadosAdmin();

/**
 * Crear la cuenta de la app. No exige sesión (la persona todavía no tiene cuenta):
 * la seguridad está en el segundo dato (contrato o código) y en el límite de intentos.
 */
export const registrarCuentaAfiliadoFn = onCall<RegistrarCuentaAfiliadoInput>(async (request) => {
  const d = request.data ?? ({} as RegistrarCuentaAfiliadoInput);
  const input: RegistrarCuentaAfiliadoInput = {
    cedula: String(d.cedula ?? ""),
    numeroContrato: d.numeroContrato ? String(d.numeroContrato) : undefined,
    codigoActivacion: d.codigoActivacion ? String(d.codigoActivacion) : undefined,
    pin: String(d.pin ?? ""),
    aceptaHabeasData: d.aceptaHabeasData === true,
    versionHabeasData: String(d.versionHabeasData ?? ""),
  };
  try {
    await registrarCuentaAfiliado(afiliadosRepo, cuentasRepo, auth, input);
    return { ok: true };
  } catch (err) {
    if (err instanceof ErrorRegistro) throw new HttpsError("failed-precondition", err.message);
    // Nunca registrar en logs la cédula, el contrato ni el PIN (Habeas Data).
    console.error("registrarCuentaAfiliadoFn:", err instanceof Error ? err.message : err);
    throw new HttpsError("internal", "No pudimos crear tu cuenta. Intenta de nuevo en unos minutos.");
  }
});
