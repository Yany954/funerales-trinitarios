import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireAuth } from "../../infrastructure/auth/rbac";
import { PagosRepositoryFirestore } from "../../infrastructure/firebase/pago.repository.firestore";
import { AfiliadosRepositoryFirestore } from "../../infrastructure/firebase/afiliados.repository.firestore";
import { registrarPago, RegistrarPagoInput } from "../../application/pagos/registrarPago.usecase";
import { listarPagosPorAfiliado } from "../../application/pagos/listarPagosPorAfiliado.usecase";
import { metadataHumano } from "../../domain/value-objects/metadata-cambio";

const pagosRepo = new PagosRepositoryFirestore();
const afiliadosRepo = new AfiliadosRepositoryFirestore();

export const registrarPagoFn = onCall<RegistrarPagoInput>(async (request) => {
  const uid = requireAuth(request);
  if (request.auth?.token.rol !== "admin" && request.data.sede !== request.auth?.token.sede) {
    throw new HttpsError("permission-denied", "No puedes registrar pagos de otra sede.");
  }
  const pago = await registrarPago(pagosRepo, afiliadosRepo, request.data, metadataHumano(uid));
  return { pago };
});

export const listarPagosPorAfiliadoFn = onCall<{ afiliadoId: string }>(async (request) => {
  requireAuth(request);
  const pagos = await listarPagosPorAfiliado(pagosRepo, request.data.afiliadoId);
  return { pagos };
});