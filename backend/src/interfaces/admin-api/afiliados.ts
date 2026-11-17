import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import { requireAuth } from "../../infrastructure/auth/rbac";
import { AfiliadosRepositoryFirestore } from "../../infrastructure/firebase/afiliados.repository.firestore";
import { Afiliado, Beneficiario } from "../../domain/entities/afiliado";
import { metadataHumano } from "../../domain/value-objects/metadata-cambio";
import { limiteBeneficiariosDelPlan } from "../../domain/value-objects/cupo-beneficiarios";
import { PlanesRepositoryFirestore } from "../../infrastructure/firebase/plan.repository.firestore";
import { COLECCION_PAGOS_SEGURO, PagosRepositoryFirestore } from "../../infrastructure/firebase/pago.repository.firestore";
import { guardarSeguroVida } from "../../application/seguros/seguroVida";
import { recalcularAfiliadoDesdePagos } from "../../application/pagos/recalcularAfiliadoDesdePagos";

import { crearAfiliado, CrearAfiliadoInput } from "../../application/afiliados/crear-afiliado.usecase";
import { buscarPersonaCubierta } from "../../application/afiliados/buscar-persona-cubierta.usecase";
import { actualizarAfiliado, ActualizarAfiliadoInput } from "../../application/afiliados/actualizarAfiliado.usecase";
import { eliminarAfiliado } from "../../application/afiliados/eliminarAfiliado.usecase";
import { actualizarBeneficiarios, ActualizarBeneficiariosInput } from "../../application/afiliados/actualizarBeneficiarios.usecase";
import { registrarFallecimientoBeneficiario, RegistrarFallecimientoBeneficiarioInput } from "../../application/afiliados/registrarFallecimientoBeneficiario.usecase";
import {
  registrarNovedadBeneficiario,
  deshacerNovedadBeneficiario,
  RegistrarNovedadInput,
  DeshacerNovedadInput,
} from "../../application/afiliados/novedadesBeneficiario.usecase";

const repo = new AfiliadosRepositoryFirestore();
const planesRepo = new PlanesRepositoryFirestore();
const pagosRepo = new PagosRepositoryFirestore();
const pagosSeguroRepo = new PagosRepositoryFirestore(COLECCION_PAGOS_SEGURO);

/** Cupos sin costo extra (integral en Pelaya: 8, demás: 7). */
async function limiteDelPlan(planId: string | undefined, sede: string | undefined): Promise<number> {
  const plan = planId ? await planesRepo.obtenerPorId(planId) : null;
  return limiteBeneficiariosDelPlan(plan?.nombre, sede);
}

async function limiteDelAfiliado(afiliadoId: string): Promise<number> {
  const afiliado = await repo.obtenerPorId(afiliadoId);
  return limiteDelPlan(afiliado?.planId, afiliado?.sede);
}

// ---------- Helpers de serialización (nunca mandar un Date/Timestamp crudo por la red) ----------

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

export function serializarAfiliado(a: Afiliado) {
  return {
    ...a,
    metadata: undefined,
    fechaAfiliacion: iso(a.fechaAfiliacion),
    fechaAfiliacionReal: iso(a.fechaAfiliacionReal),
    fechaNacimiento: iso(a.fechaNacimiento),
    ultimoPago: a.ultimoPago ? { ...a.ultimoPago, fecha: iso(a.ultimoPago.fecha) } : null,
    beneficiarios: a.beneficiarios.map(serializarBeneficiario),
    seguroVida: a.seguroVida
      ? {
          ...a.seguroVida,
          fechaInicio: iso(a.seguroVida.fechaInicio),
          ultimoPago: a.seguroVida.ultimoPago ? { ...a.seguroVida.ultimoPago, fecha: iso(a.seguroVida.ultimoPago.fecha) } : null,
        }
      : undefined,
  };
}

// ---------- Helpers de autorización / manejo de errores ----------

/** Para funciones cuyo input trae afiliadoId — verifica sesión y que la sede coincida (o sea admin). */
export async function autorizar(request: CallableRequest<{ afiliadoId: string }>): Promise<string> {
  const uid = requireAuth(request);
  const afiliado = await repo.obtenerPorId(request.data.afiliadoId);
  if (!afiliado) throw new HttpsError("not-found", "Ese afiliado no existe.");
  if (request.auth?.token.rol !== "admin" && afiliado.sede !== request.auth?.token.sede) {
    throw new HttpsError("permission-denied", "No puedes editar afiliados de otra sede.");
  }
  return uid;
}

/** Convierte cualquier Error lanzado por un caso de uso en un HttpsError legible para el cliente. */
export async function ejecutar<T>(accion: () => Promise<T>): Promise<T> {
  try {
    return await accion();
  } catch (err) {
    console.error(err);
    throw new HttpsError("failed-precondition", err instanceof Error ? err.message : "No se pudo completar la acción.");
  }
}

// ---------- Funciones expuestas al frontend ----------

/** El dashboard llama esto para crear un afiliado nuevo. */
export const crearAfiliadoFn = onCall<CrearAfiliadoInput>(async (request) => {
  const uid = requireAuth(request);
  // Quien no es admin solo puede crear afiliados en su propia sede.
  if (request.auth?.token.rol !== "admin") {
    const sede = request.auth?.token.sede;
    if (!sede || sede === "all") throw new HttpsError("permission-denied", "Tu usuario no tiene una sede asignada.");
    request.data.sede = sede;
  }
  const limite = await limiteDelPlan(request.data.planId, request.data.sede);
  let afiliado = await ejecutar(() => crearAfiliado(repo, request.data, metadataHumano(uid), limite));
  const seguro = request.data.seguroVida;
  if (request.data.tieneSeguroVida && seguro) {
    afiliado = await ejecutar(() => guardarSeguroVida(repo, pagosSeguroRepo, { ...seguro, afiliadoId: afiliado.id }, metadataHumano(uid)));
  }
  return { afiliado: serializarAfiliado(afiliado) };
});

/** El dashboard (y en el futuro el bot de WhatsApp) llama esto para saber si alguien tiene plan. */
export const buscarPersonaCubiertaFn = onCall<{ termino: string }>(async (request) => {
  requireAuth(request);
  const resultados = await buscarPersonaCubierta(repo, request.data.termino);
  return {
    resultados: resultados.map((r) => ({
      ...r,
      afiliado: serializarAfiliado(r.afiliado),
    })),
  };
});

export const actualizarAfiliadoFn = onCall<ActualizarAfiliadoInput>(async (request) => {
  const uid = requireAuth(request);
  const afiliado = await repo.obtenerPorId(request.data.id);
  if (!afiliado) throw new HttpsError("not-found", "Ese afiliado no existe.");
  if (request.auth?.token.rol !== "admin" && afiliado.sede !== request.auth?.token.sede) {
    throw new HttpsError("permission-denied", "No puedes editar afiliados de otra sede.");
  }
  // El seguro se activa con guardarSeguroVidaFn (necesita precio, beneficiario y primer pago).
  const datos = { ...request.data };
  if (datos.tieneSeguroVida && !afiliado.seguroVida) delete datos.tieneSeguroVida;
  let actualizado = await ejecutar(() => actualizarAfiliado(repo, datos, metadataHumano(uid)));
  if (datos.fechaAfiliacionReal) {
    // Cambiar la fecha de afiliación cambia el día de corte → recalcula el estado.
    await recalcularAfiliadoDesdePagos(repo, pagosRepo, afiliado.id, metadataHumano(uid));
    actualizado = (await repo.obtenerPorId(afiliado.id)) ?? actualizado;
  }
  return { afiliado: serializarAfiliado(actualizado) };
});

export const eliminarAfiliadoFn = onCall<{ id: string }>(async (request) => {
  requireAuth(request);
  if (request.auth?.token.rol !== "admin") {
    throw new HttpsError("permission-denied", "Solo un administrador puede eliminar afiliados.");
  }
  await ejecutar(() => eliminarAfiliado(repo, request.data.id));
  return { ok: true };
});

export const actualizarBeneficiariosFn = onCall<ActualizarBeneficiariosInput>(async (request) => {
  const uid = await autorizar(request);
  const limite = await limiteDelAfiliado(request.data.afiliadoId);
  const actualizado = await ejecutar(() => actualizarBeneficiarios(repo, request.data, metadataHumano(uid), limite));
  return { afiliado: serializarAfiliado(actualizado) };
});

export const registrarFallecimientoBeneficiarioFn = onCall<RegistrarFallecimientoBeneficiarioInput>(async (request) => {
  const uid = await autorizar(request);
  const afiliado = await ejecutar(() => registrarFallecimientoBeneficiario(repo, request.data, metadataHumano(uid)));
  return { afiliado: serializarAfiliado(afiliado) };
});

export const registrarNovedadBeneficiarioFn = onCall<RegistrarNovedadInput>(async (request) => {
  const uid = await autorizar(request);
  const limite = await limiteDelAfiliado(request.data.afiliadoId);
  const afiliado = await ejecutar(() => registrarNovedadBeneficiario(repo, request.data, metadataHumano(uid), limite));
  return { afiliado: serializarAfiliado(afiliado) };
});

export const deshacerNovedadBeneficiarioFn = onCall<DeshacerNovedadInput>(async (request) => {
  const uid = await autorizar(request);
  const limite = await limiteDelAfiliado(request.data.afiliadoId);
  const afiliado = await ejecutar(() => deshacerNovedadBeneficiario(repo, request.data, metadataHumano(uid), limite));
  return { afiliado: serializarAfiliado(afiliado) };
});

// ---------- TEMPORAL: borrar después de correrla una vez (ver mensaje sobre reindexar búsqueda) ----------
export const reindexarPersonasCubiertasFn = onCall(async (request) => {
  requireAuth(request);
  if (request.auth?.token.rol !== "admin") {
    throw new HttpsError("permission-denied", "Solo un administrador puede hacer esto.");
  }
  const afiliados = await repo.listarTodos();
  for (const a of afiliados) {
    await repo.sincronizarPersonasCubiertas(a);
  }
  return { ok: true, total: afiliados.length };
});