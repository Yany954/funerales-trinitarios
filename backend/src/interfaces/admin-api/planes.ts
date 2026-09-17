import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireAuth } from "../../infrastructure/auth/rbac";
import { PlanesRepositoryFirestore } from "../../infrastructure/firebase/plan.repository.firestore";
import { crearPlan, CrearPlanInput } from "../../application/planes/crearPlan.usecase";
import { actualizarPlan, ActualizarPlanInput } from "../../application/planes/actualizarPlan.usecase";
import { guardarPrecioAnio, GuardarPrecioAnioInput } from "../../application/planes/guardarPrecioAnio.usecase";
import { metadataHumano } from "../../domain/value-objects/metadata-cambio";

const repo = new PlanesRepositoryFirestore();

function exigirAdmin(request: any) {
  if (request.auth?.token.rol !== "admin") {
    throw new HttpsError("permission-denied", "Solo un administrador puede editar los planes funerarios.");
  }
}

export const crearPlanFn = onCall<CrearPlanInput>(async (request) => {
  const uid = requireAuth(request);
  exigirAdmin(request);
  const plan = await crearPlan(repo, request.data, metadataHumano(uid));
  return { plan };
});

export const actualizarPlanFn = onCall<ActualizarPlanInput>(async (request) => {
  const uid = requireAuth(request);
  exigirAdmin(request);
  const plan = await actualizarPlan(repo, request.data, metadataHumano(uid));
  return { plan };
});

export const guardarPrecioAnioFn = onCall<GuardarPrecioAnioInput>(async (request) => {
  const uid = requireAuth(request);
  exigirAdmin(request);
  await guardarPrecioAnio(repo, request.data, metadataHumano(uid));
  return { ok: true };
});