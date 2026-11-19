import { CallableRequest, HttpsError } from "firebase-functions/v2/https";

/**
 * Exige que quien llama esté autenticado. Lanza un error HTTPS claro
 * si no lo está, para que el frontend pueda mostrarlo tal cual.
 * Cuando el equipo crezca, aquí se agregan roles (admin / coordinador / staff)
 * usando custom claims de Firebase Auth, igual que en hotel-ai-assistant.
 */
export function requireAuth(request: CallableRequest): string {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión para hacer esto.");
  }
  // Solo cuentas creadas por un administrador (tienen rol). Si alguien se
  // registra por su cuenta con la API pública, no tiene rol y no puede hacer nada.
  const rol = request.auth.token.rol;
  if (rol !== "admin" && rol !== "empleado") {
    throw new HttpsError("permission-denied", "Tu cuenta no tiene acceso. Pide a un administrador que te asigne un rol.");
  }
  return request.auth.uid;
}

/**
 * Para las callables de la app móvil (afiliados-api): exige sesión con rol
 * "afiliado" y devuelve SU afiliadoId, sacado del token — nunca del input,
 * para que nadie pueda pedir datos de otro titular cambiando un parámetro.
 */
export function requireAfiliado(request: CallableRequest): { uid: string; afiliadoId: string } {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión para hacer esto.");
  }
  const { rol, afiliadoId } = request.auth.token;
  if (rol !== "afiliado" || typeof afiliadoId !== "string" || !afiliadoId) {
    throw new HttpsError("permission-denied", "Esta cuenta no está vinculada a una afiliación.");
  }
  return { uid: request.auth.uid, afiliadoId };
}
