import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireAuth } from "../../infrastructure/auth/rbac";
import { asignarRol } from "../../application/usuarios/asignarRol.usecase";
import { ClaimsUsuario } from "../../domain/value-objects/rol-usuario";

export const asignarRolFn = onCall<{ uid: string; claims: ClaimsUsuario }>(async (request) => {
  requireAuth(request);
  if (request.auth?.token.rol !== "admin") {
    throw new HttpsError("permission-denied", "Solo un administrador puede asignar roles.");
  }
  await asignarRol(request.data.uid, request.data.claims);
  return { ok: true };
});