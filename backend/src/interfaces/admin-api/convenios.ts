import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireAuth } from "../../infrastructure/auth/rbac";
import { ConveniosRepositoryFirestore } from "../../infrastructure/firebase/convenio.repository.firestore";
import { crearConvenio, CrearConvenioInput } from "../../application/convenios/crearConvenio.usecase";
import { guardarTarifa, GuardarTarifaInput } from "../../application/convenios/guardarTarifa.usecase";
import { metadataHumano } from "../../domain/value-objects/metadata-cambio";

const repo = new ConveniosRepositoryFirestore();

function exigirAdmin(request: any) {
  if (request.auth?.token.rol !== "admin") {
    throw new HttpsError("permission-denied", "Solo un administrador puede editar convenios y tarifas.");
  }
}

export const crearConvenioFn = onCall<CrearConvenioInput>(async (request) => {
  const uid = requireAuth(request);
  exigirAdmin(request);
  const convenio = await crearConvenio(repo, request.data, metadataHumano(uid));
  return { convenio };
});

export const guardarTarifaFn = onCall<GuardarTarifaInput>(async (request) => {
  const uid = requireAuth(request);
  exigirAdmin(request);
  await guardarTarifa(repo, request.data, metadataHumano(uid));
  return { ok: true };
});