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
  return request.auth.uid;
}
