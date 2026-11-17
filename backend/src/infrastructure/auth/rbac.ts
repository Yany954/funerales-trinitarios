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
