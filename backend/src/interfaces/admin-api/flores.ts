import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireAuth } from "../../infrastructure/auth/rbac";
import { FloresRepositoryFirestore } from "../../infrastructure/firebase/flor.repository.firestore";
import { crearFlor, CrearFlorInput } from "../../application/flores/crearFlor.usecase";
import { actualizarFlor, ActualizarFlorInput } from "../../application/flores/actualizarFlor.usecase";
import { eliminarFlor } from "../../application/flores/eliminarFlor.usecase";
import { metadataHumano } from "../../domain/value-objects/metadata-cambio";

const repo = new FloresRepositoryFirestore();

function exigirAdmin(request: any) {
  if (request.auth?.token.rol !== "admin") {
    throw new HttpsError("permission-denied", "Solo un administrador puede editar el catálogo de flores.");
  }
}

export const crearFlorFn = onCall<CrearFlorInput>(async (request) => {
  const uid = requireAuth(request);
  exigirAdmin(request);
  const flor = await crearFlor(repo, request.data, metadataHumano(uid));
  return { flor };
});

export const actualizarFlorFn = onCall<ActualizarFlorInput>(async (request) => {
  const uid = requireAuth(request);
  exigirAdmin(request);
  const flor = await actualizarFlor(repo, request.data, metadataHumano(uid));
  return { flor };
});

export const eliminarFlorFn = onCall<{ id: string }>(async (request) => {
  requireAuth(request);
  exigirAdmin(request);
  await eliminarFlor(repo, request.data.id);
  return { ok: true };
});