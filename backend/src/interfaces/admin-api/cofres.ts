import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireAuth } from "../../infrastructure/auth/rbac";
import { CofresRepositoryFirestore } from "../../infrastructure/firebase/cofre.repository.firestore";
import { crearTipoCofre, CrearTipoCofreInput } from "../../application/cofres/crearTipoCofre.usecase";
import { metadataHumano } from "../../domain/value-objects/metadata-cambio";

const repo = new CofresRepositoryFirestore();

export const crearTipoCofreFn = onCall<CrearTipoCofreInput>(async (request) => {
  const uid = requireAuth(request);
  if (request.auth?.token.rol !== "admin") {
    throw new HttpsError("permission-denied", "Solo un administrador puede editar el catálogo de cofres.");
  }
  const cofre = await crearTipoCofre(repo, request.data, metadataHumano(uid));
  return { cofre };
});