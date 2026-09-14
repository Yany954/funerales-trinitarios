import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireAuth } from "../../infrastructure/auth/rbac";
import { FloresRepositoryFirestore } from "../../infrastructure/firebase/flor.repository.firebase";
import { crearFlor, CrearFlorInput } from "../../application/flores/crearFlor.usecase";
import { metadataHumano } from "../../domain/value-objects/metadata-cambio";

const repo = new FloresRepositoryFirestore();

export const crearFlorFn = onCall<CrearFlorInput>(async (request) => {
  const uid = requireAuth(request);
  if (request.auth?.token.rol !== "admin") {
    throw new HttpsError("permission-denied", "Solo un administrador puede editar el catálogo de flores.");
  }
  const flor = await crearFlor(repo, request.data, metadataHumano(uid));
  return { flor };
});