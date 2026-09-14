import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireAuth } from "../../infrastructure/auth/rbac";
import { PlanesRepositoryFirestore } from "../../infrastructure/firebase/plan.repository.firestore";
import { crearPlan, CrearPlanInput } from "../../application/planes/crearPlan.usecase";
import { metadataHumano } from "../../domain/value-objects/metadata-cambio";

const repo = new PlanesRepositoryFirestore();

export const crearPlanFn = onCall<CrearPlanInput>(async (request) => {
  const uid = requireAuth(request);
  if (request.auth?.token.rol !== "admin") {
    throw new HttpsError("permission-denied", "Solo un administrador puede editar los planes funerarios.");
  }
  const plan = await crearPlan(repo, request.data, metadataHumano(uid));
  return { plan };
});