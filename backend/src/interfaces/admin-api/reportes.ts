import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireAuth } from "../../infrastructure/auth/rbac";
import { ServiciosRepositoryFirestore } from "../../infrastructure/firebase/servicio.repository.firestore";
import { ConveniosRepositoryFirestore } from "../../infrastructure/firebase/convenio.repository.firestore";
import { generarReporte, GenerarReporteInput } from "../../application/reportes/generarReporte.usecase";

const serviciosRepo = new ServiciosRepositoryFirestore();
const conveniosRepo = new ConveniosRepositoryFirestore();

export const generarReporteFn = onCall<GenerarReporteInput>(async (request) => {
  requireAuth(request);
  if (request.auth?.token.rol !== "admin") {
    if (request.data.filtroTipo !== "sede" || request.data.filtroValor !== request.auth?.token.sede) {
      throw new HttpsError("permission-denied", "Solo puedes generar el reporte de tu propia sede.");
    }
  }
  const filas = await generarReporte(serviciosRepo, conveniosRepo, request.data);
  return { filas };
});