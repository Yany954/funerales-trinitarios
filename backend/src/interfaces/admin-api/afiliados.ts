import { HttpsError, onCall } from "firebase-functions/v2/https";
import { requireAuth } from "../../infrastructure/auth/rbac";
import { AfiliadosRepositoryFirestore } from "../../infrastructure/firebase/afiliados.repository.firestore";
import { crearAfiliado, CrearAfiliadoInput } from "../../application/afiliados/crear-afiliado.usecase";
import { buscarPersonaCubierta } from "../../application/afiliados/buscar-persona-cubierta.usecase";
import { metadataHumano } from "../../domain/value-objects/metadata-cambio";
import { actualizarBeneficiarios, ActualizarBeneficiariosInput } from "../../application/afiliados/actualizarBeneficiarios.usecase";
import { actualizarAfiliado, ActualizarAfiliadoInput } from "../../application/afiliados/actualizarAfiliados.usecase";
import { eliminarAfiliado } from "../../application/afiliados/eliminarAfiliado.usecase";
import { registrarFallecimientoBeneficiario, RegistrarFallecimientoBeneficiarioInput } from "../../application/afiliados/registrarFallecimientoBeneficiario.usecase";
import { CallableRequest } from "firebase-functions/v2/https";
import { Afiliado, Beneficiario } from "../../domain/entities/afiliado";
import { registrarNovedadBeneficiario, deshacerNovedadBeneficiario, RegistrarNovedadInput, DeshacerNovedadInput } from "../../application/afiliados/novedadesBeneficiario.usecase";

const repo = new AfiliadosRepositoryFirestore();

/** El dashboard llama esto para crear un afiliado nuevo. */
export const crearAfiliadoFn = onCall<CrearAfiliadoInput>(async (request) => {
  const uid = requireAuth(request);
  if (request.auth?.token.rol !== "admin" && request.data.sede !== request.auth?.token.sede) {
    throw new HttpsError("permission-denied", "No puedes crear afiliados fuera de tu sede.");
  }
  const afiliado = await crearAfiliado(repo, request.data, metadataHumano(uid));
  return { afiliado };
});

/** El dashboard (y en el futuro el bot de WhatsApp) llama esto para saber si alguien tiene plan. */
export const buscarPersonaCubiertaFn = onCall<{ termino: string }>(async (request) => {
  requireAuth(request);
  const resultados = await buscarPersonaCubierta(repo, request.data.termino);
  return { resultados };
});

export const actualizarBeneficiariosFn = onCall<ActualizarBeneficiariosInput>(async (request) => {
  const uid = requireAuth(request);
  const afiliado = await repo.obtenerPorId(request.data.afiliadoId);
  if (!afiliado) throw new HttpsError("not-found", "Ese afiliado no existe.");
  if (request.auth?.token.rol !== "admin" && afiliado.sede !== request.auth?.token.sede) {
    throw new HttpsError("permission-denied", "No puedes editar afiliados de otra sede.");
  }
  try {
    const actualizado = await actualizarBeneficiarios(repo, request.data, metadataHumano(uid));
    return { afiliado: actualizado };
  } catch (err) {
    console.error("actualizarBeneficiariosFn falló:", err);
    throw new HttpsError("failed-precondition", err instanceof Error ? err.message : "No se pudo guardar.");
  }
});

export const actualizarAfiliadoFn = onCall<ActualizarAfiliadoInput>(async (request) => {
  const uid = requireAuth(request);
  const afiliado = await repo.obtenerPorId(request.data.id);
  if (!afiliado) throw new HttpsError("not-found", "Ese afiliado no existe.");
  if (request.auth?.token.rol !== "admin" && afiliado.sede !== request.auth?.token.sede) {
    throw new HttpsError("permission-denied", "No puedes editar afiliados de otra sede.");
  }
  const actualizado = await actualizarAfiliado(repo, request.data, metadataHumano(uid));
  return { afiliado: actualizado };
});

export const eliminarAfiliadoFn = onCall<{ id: string }>(async (request) => {
  requireAuth(request);
  if (request.auth?.token.rol !== "admin") {
    throw new HttpsError("permission-denied", "Solo un administrador puede eliminar afiliados.");
  }
  await eliminarAfiliado(repo, request.data.id);
  return { ok: true };
});



function iso(valor: unknown): string | undefined {
  if (!valor) return undefined;
  const conToDate = valor as { toDate?: () => Date };
  const fecha = conToDate.toDate ? conToDate.toDate() : (valor as Date);
  return fecha instanceof Date && !isNaN(fecha.getTime()) ? fecha.toISOString() : undefined;
}

function serializarBeneficiario(b: Beneficiario) {
  return {
    ...b,
    fechaNacimiento: iso(b.fechaNacimiento),
    fechaAdicion: iso(b.fechaAdicion),
    fechaFallecimiento: iso(b.fechaFallecimiento),
    novedades: b.novedades?.map((n) => ({ ...n, fecha: iso(n.fecha) })),
  };
}

function serializarAfiliado(a: Afiliado) {
  return {
    ...a,
    metadata: undefined,
    fechaAfiliacion: iso(a.fechaAfiliacion),
    fechaAfiliacionReal: iso(a.fechaAfiliacionReal),
    fechaNacimiento: iso(a.fechaNacimiento),
    ultimoPago: a.ultimoPago ? { ...a.ultimoPago, fecha: iso(a.ultimoPago.fecha) } : null,
    beneficiarios: a.beneficiarios.map(serializarBeneficiario),
  };
}

async function autorizar(request: CallableRequest<{ afiliadoId: string }>): Promise<string> {
  const uid = requireAuth(request);
  const afiliado = await repo.obtenerPorId(request.data.afiliadoId);
  if (!afiliado) throw new HttpsError("not-found", "Ese afiliado no existe.");
  if (request.auth?.token.rol !== "admin" && afiliado.sede !== request.auth?.token.sede) {
    throw new HttpsError("permission-denied", "No puedes editar afiliados de otra sede.");
  }
  return uid;
}

async function ejecutar<T>(accion: () => Promise<T>): Promise<T> {
  try {
    return await accion();
  } catch (err) {
    console.error(err);
    throw new HttpsError("failed-precondition", err instanceof Error ? err.message : "No se pudo completar la acción.");
  }
}

export const registrarFallecimientoBeneficiarioFn = onCall<RegistrarFallecimientoBeneficiarioInput>(async (request) => {
  const uid = await autorizar(request);
  const afiliado = await ejecutar(() => registrarFallecimientoBeneficiario(repo, request.data, metadataHumano(uid)));
  return { afiliado: serializarAfiliado(afiliado) };
});

export const registrarNovedadBeneficiarioFn = onCall<RegistrarNovedadInput>(async (request) => {
  const uid = await autorizar(request);
  const afiliado = await ejecutar(() => registrarNovedadBeneficiario(repo, request.data, metadataHumano(uid)));
  return { afiliado: serializarAfiliado(afiliado) };
});

export const deshacerNovedadBeneficiarioFn = onCall<DeshacerNovedadInput>(async (request) => {
  const uid = await autorizar(request);
  const afiliado = await ejecutar(() => deshacerNovedadBeneficiario(repo, request.data, metadataHumano(uid)));
  return { afiliado: serializarAfiliado(afiliado) };
});