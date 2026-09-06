import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireAuth } from "../../infrastructure/auth/rbac";
import { ServiciosRepositoryFirestore } from "../../infrastructure/firebase/servicio.repository.firestore";
import { registrarServicio, RegistrarServicioInput } from "../../application/servicios/registrarServicio.usecase";
import { metadataHumano } from "../../domain/value-objects/metadata-cambio";

const repo = new ServiciosRepositoryFirestore();

export const registrarServicioFn = onCall<RegistrarServicioInput>(async (request) => {
  const uid = requireAuth(request);

  // Mismo candado que ya tienes en afiliados: un empleado no puede registrar
  // servicios fuera de su propia sede, sin importar lo que mande el formulario.
  if (request.auth?.token.rol !== "admin" && request.data.sede !== request.auth?.token.sede) {
    throw new HttpsError("permission-denied", "No puedes registrar servicios fuera de tu sede.");
  }

  const servicio = await registrarServicio(repo, request.data, metadataHumano(uid));
  return { servicio };
});