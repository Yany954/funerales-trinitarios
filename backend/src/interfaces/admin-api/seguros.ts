import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireAuth } from "../../infrastructure/auth/rbac";
import { AfiliadosRepositoryFirestore } from "../../infrastructure/firebase/afiliados.repository.firestore";
import { COLECCION_PAGOS_SEGURO, PagosRepositoryFirestore } from "../../infrastructure/firebase/pago.repository.firestore";
import { metadataHumano } from "../../domain/value-objects/metadata-cambio";
import { Pago } from "../../domain/entities/pago";
import {
  crearTitularSeguro,
  CrearTitularSeguroInput,
  guardarSeguroVida,
  GuardarSeguroVidaInput,
  recalcularSeguroDesdePagos,
} from "../../application/seguros/seguroVida";
import { registrarPago, RegistrarPagoInput } from "../../application/pagos/registrarPago.usecase";
import { actualizarPago, ActualizarPagoInput } from "../../application/pagos/actualizarPago.usecase";
import { eliminarPago } from "../../application/pagos/eliminarPago.usecase";
import { autorizar, ejecutar, serializarAfiliado } from "./afiliados";

const afiliadosRepo = new AfiliadosRepositoryFirestore();
const pagosSeguroRepo = new PagosRepositoryFirestore(COLECCION_PAGOS_SEGURO);

function serializarPago(p: Pago) {
  return { ...p, metadata: undefined, fecha: p.fecha.toISOString() };
}

/** Crea un titular que solo tiene seguro de vida (sin plan exequial). */
export const crearTitularSeguroFn = onCall<CrearTitularSeguroInput>(async (request) => {
  const uid = requireAuth(request);
  const token = request.auth?.token;
  // Quien no es admin solo puede crear en su propia sede.
  const sede = token?.rol === "admin" ? request.data.sede : token?.sede;
  if (!sede) throw new HttpsError("invalid-argument", "La sede es obligatoria.");
  const afiliado = await ejecutar(() =>
    crearTitularSeguro(afiliadosRepo, pagosSeguroRepo, { ...request.data, sede }, metadataHumano(uid))
  );
  return { afiliado: serializarAfiliado(afiliado) };
});

/** Activa (con su primer pago) o edita el seguro de vida de un afiliado. */
export const guardarSeguroVidaFn = onCall<GuardarSeguroVidaInput>(async (request) => {
  const uid = await autorizar(request);
  const afiliado = await ejecutar(() => guardarSeguroVida(afiliadosRepo, pagosSeguroRepo, request.data, metadataHumano(uid)));
  return { afiliado: serializarAfiliado(afiliado) };
});

export const registrarPagoSeguroFn = onCall<RegistrarPagoInput>(async (request) => {
  const uid = await autorizar(request);
  const pago = await ejecutar(() =>
    registrarPago(pagosSeguroRepo, afiliadosRepo, request.data, metadataHumano(uid), recalcularSeguroDesdePagos)
  );
  return { pago: serializarPago(pago) };
});

export const listarPagosSeguroFn = onCall<{ afiliadoId: string }>(async (request) => {
  await autorizar(request);
  const pagos = await pagosSeguroRepo.listarPorAfiliado(request.data.afiliadoId);
  return { pagos: pagos.map(serializarPago) };
});

export const actualizarPagoSeguroFn = onCall<ActualizarPagoInput>(async (request) => {
  const uid = requireAuth(request);
  const actual = await pagosSeguroRepo.obtenerPorId(request.data.id);
  if (!actual) throw new HttpsError("not-found", "Ese pago no existe.");
  if (request.auth?.token.rol !== "admin" && actual.sede !== request.auth?.token.sede) {
    throw new HttpsError("permission-denied", "No puedes editar pagos de otra sede.");
  }
  const pago = await ejecutar(() =>
    actualizarPago(pagosSeguroRepo, afiliadosRepo, request.data, metadataHumano(uid), recalcularSeguroDesdePagos)
  );
  return { pago: serializarPago(pago) };
});

export const eliminarPagoSeguroFn = onCall<{ id: string }>(async (request) => {
  const uid = requireAuth(request);
  if (request.auth?.token.rol !== "admin") {
    throw new HttpsError("permission-denied", "Solo un administrador puede eliminar pagos.");
  }
  await ejecutar(() => eliminarPago(pagosSeguroRepo, afiliadosRepo, request.data.id, metadataHumano(uid), recalcularSeguroDesdePagos));
  return { ok: true };
});
