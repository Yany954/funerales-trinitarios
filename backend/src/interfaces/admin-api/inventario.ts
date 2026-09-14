import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireAuth } from "../../infrastructure/auth/rbac";
import { InventarioRepositoryFirestore } from "../../infrastructure/firebase/inventario.repository.firestore";
import { actualizarInventario, ActualizarInventarioInput } from "../../application/inventario/actualizarInventario.usecase";
import { metadataHumano } from "../../domain/value-objects/metadata-cambio";

const repo = new InventarioRepositoryFirestore();

export const actualizarInventarioFn = onCall<ActualizarInventarioInput>(async (request) => {
  const uid = requireAuth(request);
  if (request.auth?.token.rol !== "admin" && request.data.sede !== request.auth?.token.sede) {
    throw new HttpsError("permission-denied", "No puedes editar el inventario de otra sede.");
  }
  const registro = await actualizarInventario(repo, request.data, metadataHumano(uid));
  return { registro };
});