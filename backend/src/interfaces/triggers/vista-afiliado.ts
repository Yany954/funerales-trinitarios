import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { AfiliadosRepositoryFirestore } from "../../infrastructure/firebase/afiliados.repository.firestore";
import { PlanesRepositoryFirestore } from "../../infrastructure/firebase/plan.repository.firestore";
import { COLECCION_PAGOS, COLECCION_PAGOS_SEGURO, PagosRepositoryFirestore } from "../../infrastructure/firebase/pago.repository.firestore";
import { ServiciosRepositoryFirestore } from "../../infrastructure/firebase/servicio.repository.firestore";
import { CuentasAfiliadoRepositoryFirestore } from "../../infrastructure/firebase/cuentas-afiliado.repository.firestore";
import { VistaAfiliadoRepositoryFirestore } from "../../infrastructure/firebase/vista-afiliado.repository.firestore";
import { actualizarVistaAfiliado, DependenciasVista } from "../../application/vista-afiliado/actualizarVistaAfiliado.usecase";

/**
 * Triggers que mantienen al día "vista_afiliado" (lo que ve la app).
 *
 * Por qué triggers y no llamadas en cada callable: así NINGÚN camino de
 * escritura se escapa (dashboard, app, cobro automático de mora, cambios
 * futuros). Si alguien agrega o retira un beneficiario en el dashboard, la
 * app del titular lo ve en segundos; y cuando el titular pida un cambio desde
 * la app (Fase 3), se guarda en "afiliados" y el dashboard lo ve igual.
 */

export const dependenciasVista: DependenciasVista = {
  afiliados: new AfiliadosRepositoryFirestore(),
  planes: new PlanesRepositoryFirestore(),
  pagosPlan: new PagosRepositoryFirestore(COLECCION_PAGOS),
  pagosSeguro: new PagosRepositoryFirestore(COLECCION_PAGOS_SEGURO),
  servicios: new ServiciosRepositoryFirestore(),
  cuentas: new CuentasAfiliadoRepositoryFirestore(),
  vistas: new VistaAfiliadoRepositoryFirestore(),
};

async function refrescar(afiliadoIds: (string | undefined | null)[]): Promise<void> {
  const unicos = [...new Set(afiliadoIds.filter((id): id is string => !!id))];
  await Promise.all(unicos.map((id) => actualizarVistaAfiliado(dependenciasVista, id)));
}

/** Campos de un documento antes y después del cambio (creado, editado o borrado). */
function antesYDespues(event: { data?: { before?: { data(): any }; after?: { data(): any } } }) {
  return { antes: event.data?.before?.data(), despues: event.data?.after?.data() };
}

export const vistaPorAfiliadoFn = onDocumentWritten("afiliados/{afiliadoId}", async (event) => {
  await refrescar([event.params.afiliadoId]);
});

export const vistaPorCuentaAppFn = onDocumentWritten("cuentas_afiliado/{afiliadoId}", async (event) => {
  await refrescar([event.params.afiliadoId]);
});

export const vistaPorPagoFn = onDocumentWritten(`${COLECCION_PAGOS}/{pagoId}`, async (event) => {
  const { antes, despues } = antesYDespues(event);
  await refrescar([antes?.afiliadoId, despues?.afiliadoId]);
});

export const vistaPorPagoSeguroFn = onDocumentWritten(`${COLECCION_PAGOS_SEGURO}/{pagoId}`, async (event) => {
  const { antes, despues } = antesYDespues(event);
  await refrescar([antes?.afiliadoId, despues?.afiliadoId]);
});

export const vistaPorServicioFn = onDocumentWritten("servicios/{servicioId}", async (event) => {
  const { antes, despues } = antesYDespues(event);
  const ids: (string | undefined)[] = [antes?.afiliadoId, despues?.afiliadoId];
  // Servicios viejos se enlazan solo por la cédula del titular.
  for (const cedula of new Set([antes?.cedulaTitular, despues?.cedulaTitular].filter(Boolean))) {
    const titulares = await dependenciasVista.afiliados.buscarTitularesPorCedula(String(cedula));
    ids.push(...titulares.map((t) => t.id));
  }
  await refrescar(ids);
});
