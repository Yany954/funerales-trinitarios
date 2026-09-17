import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireAuth } from "../../infrastructure/auth/rbac";
import { ServiciosRepositoryFirestore } from "../../infrastructure/firebase/servicio.repository.firestore";
import { BovedaRepositoryFirestore } from "../../infrastructure/firebase/boveda.repository.firebase";
import { registrarServicio, RegistrarServicioInput } from "../../application/servicios/registrarServicio.usecase";
import { actualizarServicio, ActualizarServicioInput } from "../../application/servicios/actualizarServicio.usecase";
import { metadataHumano } from "../../domain/value-objects/metadata-cambio";
import { cambiarEstadoFacturacion, CambiarEstadoFacturacionInput } from "../../application/servicios/cambiarEstadoFacturacion.usecase";
import { ConveniosRepositoryFirestore } from "../../infrastructure/firebase/convenio.repository.firestore";
import { eliminarServicio } from "../../application/servicios/eliminarServicio.usecase";
import { listarServiciosPorCedulaTitular } from "../../application/servicios/listarServiciosPorCedulaTitular.usecase";

const conveniosRepo = new ConveniosRepositoryFirestore();
const repo = new ServiciosRepositoryFirestore();
const bovedaRepo = new BovedaRepositoryFirestore();

export const registrarServicioFn = onCall<RegistrarServicioInput>(async (request) => {
  const uid = requireAuth(request);
  if (request.auth?.token.rol !== "admin") {
    throw new HttpsError("permission-denied", "No puedes registrar servicios fuera de tu sede.");
  }
  const servicio = await registrarServicio(repo, bovedaRepo, request.data, metadataHumano(uid));
  return { servicio };
});

export const actualizarServicioFn = onCall<ActualizarServicioInput>(async (request) => {
  const uid = requireAuth(request);
  const actual = await repo.obtenerPorId(request.data.id);
  if (!actual) throw new HttpsError("not-found", "Ese servicio no existe.");
  if (request.auth?.token.rol !== "admin") {
    throw new HttpsError("permission-denied", "No puedes editar servicios de otra sede.");
  }
  const servicio = await actualizarServicio(repo, bovedaRepo, request.data, metadataHumano(uid));
  return { servicio };
});

export const cambiarEstadoFacturacionFn = onCall<CambiarEstadoFacturacionInput>(async (request) => {
  const uid = requireAuth(request);
  if (request.auth?.token.rol !== "admin") {
    throw new HttpsError("permission-denied", "Solo un administrador puede cambiar el estado de facturación.");
  }
  const servicio = await repo.obtenerPorId(request.data.servicioId);
  if (!servicio) throw new HttpsError("not-found", "Ese servicio no existe.");
  if (request.auth?.token.rol !== "admin") {
    throw new HttpsError("permission-denied", "No puedes modificar servicios de otra sede.");
  }
  try {
    const actualizado = await cambiarEstadoFacturacion(repo, conveniosRepo, request.data, metadataHumano(uid));
    return { servicio: actualizado };
  } catch (err) {
    throw new HttpsError("failed-precondition", err instanceof Error ? err.message : "No se pudo cambiar el estado.");
  }
});

export const eliminarServicioFn = onCall<{ id: string }>(async (request) => {
  requireAuth(request);
  if (request.auth?.token.rol !== "admin") {
    throw new HttpsError("permission-denied", "Solo un administrador puede eliminar servicios.");
  }
  await eliminarServicio(repo, bovedaRepo, request.data.id);
  return { ok: true };
});

export const listarServiciosPorAfiliadoFn = onCall<{ cedula: string }>(async (request) => {
  requireAuth(request);
  const servicios = await listarServiciosPorCedulaTitular(repo, request.data.cedula);
  return { servicios: servicios.map((s) => ({ ...s, fechaServicio: s.fechaServicio.toISOString() })) };
});