import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireAuth } from "../../infrastructure/auth/rbac";
import { CofresRepositoryFirestore } from "../../infrastructure/firebase/cofre.repository.firestore";
import { crearTipoCofre, CrearTipoCofreInput } from "../../application/cofres/crearTipoCofre.usecase";
import { metadataHumano } from "../../domain/value-objects/metadata-cambio";
import { actualizarTipoCofre, ActualizarTipoCofreInput } from "../../application/cofres/actualizarTipoCofre.usecase";
import { eliminarTipoCofre } from "../../application/cofres/eliminarTipoCofre.usecase";

const repo = new CofresRepositoryFirestore();

export const crearTipoCofreFn = onCall<CrearTipoCofreInput>(async (request) => {
  const uid = requireAuth(request);
  if (request.auth?.token.rol !== "admin") {
    throw new HttpsError("permission-denied", "Solo un administrador puede editar el catálogo de cofres.");
  }
  const cofre = await crearTipoCofre(repo, request.data, metadataHumano(uid));
  return { cofre };
});
export const actualizarTipoCofreFn = onCall<ActualizarTipoCofreInput>(async (request) => {
  const uid = requireAuth(request);
  if (request.auth?.token.rol !== "admin") {
    throw new HttpsError("permission-denied", "Solo un administrador puede editar el catálogo de cofres.");
  }
  const cofre = await actualizarTipoCofre(repo, request.data, metadataHumano(uid));
  return { cofre };
});

export const eliminarTipoCofreFn = onCall<{ id: string }>(async (request) => {
  requireAuth(request);
  if (request.auth?.token.rol !== "admin") {
    throw new HttpsError("permission-denied", "Solo un administrador puede eliminar cofres del catálogo.");
  }
  await eliminarTipoCofre(repo, request.data.id);
  return { ok: true };
});