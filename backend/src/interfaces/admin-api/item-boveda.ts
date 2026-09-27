import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireAuth } from "../../infrastructure/auth/rbac";
import { ItemBovedaRepositoryFirestore } from "../../infrastructure/firebase/item-boveda.repository.firestore";
import { crearItemBoveda, CrearItemBovedaInput } from "../../application/item-boveda/crearItemBoveda.usecase";
import { actualizarItemBoveda, ActualizarItemBovedaInput } from "../../application/item-boveda/actualizarItemBoveda.usecase";
import { metadataHumano } from "../../domain/value-objects/metadata-cambio";

const repo = new ItemBovedaRepositoryFirestore();

function exigirAdmin(request: any) {
  if (request.auth?.token.rol !== "admin") {
    throw new HttpsError("permission-denied", "Solo un administrador puede editar el catálogo de bóvedas.");
  }
}

export const crearItemBovedaFn = onCall<CrearItemBovedaInput>(async (request) => {
  const uid = requireAuth(request);
  exigirAdmin(request);
  const item = await crearItemBoveda(repo, request.data, metadataHumano(uid));
  return { item };
});

export const actualizarItemBovedaFn = onCall<ActualizarItemBovedaInput>(async (request) => {
  const uid = requireAuth(request);
  exigirAdmin(request);
  const item = await actualizarItemBoveda(repo, request.data, metadataHumano(uid));
  return { item };
});

export const eliminarItemBovedaFn = onCall<{ id: string }>(async (request) => {
  requireAuth(request);
  exigirAdmin(request);
  await repo.eliminar(request.data.id);
  return { ok: true };
});