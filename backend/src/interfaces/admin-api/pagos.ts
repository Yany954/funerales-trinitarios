import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireAuth } from "../../infrastructure/auth/rbac";
import { PagosRepositoryFirestore } from "../../infrastructure/firebase/pago.repository.firestore";
import { AfiliadosRepositoryFirestore } from "../../infrastructure/firebase/afiliados.repository.firestore";
import { registrarPago, RegistrarPagoInput } from "../../application/pagos/registrarPago.usecase";
import { actualizarPago, ActualizarPagoInput } from "../../application/pagos/actualizarPago.usecase";
import { eliminarPago } from "../../application/pagos/eliminarPago.usecase";
import { listarPagosPorAfiliado } from "../../application/pagos/listarPagosPorAfiliado.usecase";
import { metadataHumano } from "../../domain/value-objects/metadata-cambio";
import { Pago } from "../../domain/entities/pago";

const pagosRepo = new PagosRepositoryFirestore();
const afiliadosRepo = new AfiliadosRepositoryFirestore();

function serializarPago(p: Pago) {
  return { ...p, metadata: undefined, fecha: p.fecha.toISOString() };
}

async function ejecutar<T>(accion: () => Promise<T>): Promise<T> {
  try {
    return await accion();
  } catch (err) {
    console.error(err);
    throw new HttpsError("failed-precondition", err instanceof Error ? err.message : "No se pudo completar la acción.");
  }
}

export const registrarPagoFn = onCall<RegistrarPagoInput>(async (request) => {
  const uid = requireAuth(request);
  if (request.auth?.token.rol !== "admin" && request.data.sede !== request.auth?.token.sede) {
    throw new HttpsError("permission-denied", "No puedes registrar pagos de otra sede.");
  }
  const pago = await ejecutar(() => registrarPago(pagosRepo, afiliadosRepo, request.data, metadataHumano(uid)));
  return { pago: serializarPago(pago) };
});

export const listarPagosPorAfiliadoFn = onCall<{ afiliadoId: string }>(async (request) => {
  requireAuth(request);
  const pagos = await listarPagosPorAfiliado(pagosRepo, request.data.afiliadoId);
  return { pagos: pagos.map(serializarPago) };
});

export const actualizarPagoFn = onCall<ActualizarPagoInput>(async (request) => {
  const uid = requireAuth(request);
  const actual = await pagosRepo.obtenerPorId(request.data.id);
  if (!actual) throw new HttpsError("not-found", "Ese pago no existe.");
  if (request.auth?.token.rol !== "admin" && actual.sede !== request.auth?.token.sede) {
    throw new HttpsError("permission-denied", "No puedes editar pagos de otra sede.");
  }
  const pago = await ejecutar(() => actualizarPago(pagosRepo, afiliadosRepo, request.data, metadataHumano(uid)));
  return { pago: serializarPago(pago) };
});

export const eliminarPagoFn = onCall<{ id: string }>(async (request) => {
  const uid = requireAuth(request);
  if (request.auth?.token.rol !== "admin") {
    throw new HttpsError("permission-denied", "Solo un administrador puede eliminar pagos.");
  }
  await ejecutar(() => eliminarPago(pagosRepo, afiliadosRepo, request.data.id, metadataHumano(uid)));
  return { ok: true };
});