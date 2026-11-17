import { onSchedule } from "firebase-functions/v2/scheduler";
import { AfiliadosRepositoryFirestore } from "../../infrastructure/firebase/afiliados.repository.firestore";
import { COLECCION_PAGOS_SEGURO, PagosRepositoryFirestore } from "../../infrastructure/firebase/pago.repository.firestore";
import { actualizarEstadosMoraSeguros } from "../../application/seguros/seguroVida";
import { actualizarEstadosMora } from "../../application/pagos/actualizarEstadosMora.usecase";
import { metadataIA } from "../../domain/value-objects/metadata-cambio";

const afiliadosRepo = new AfiliadosRepositoryFirestore();
const pagosRepo = new PagosRepositoryFirestore();
const pagosSeguroRepo = new PagosRepositoryFirestore(COLECCION_PAGOS_SEGURO);

export const actualizarEstadosMoraFn = onSchedule({ schedule: "every day 00:05", timeZone: "America/Bogota" }, async () => {
  const actualizados = await actualizarEstadosMora(afiliadosRepo, pagosRepo, metadataIA("scheduler", "scheduler-mora-afiliados"));
  console.log(`actualizarEstadosMora: ${actualizados} afiliados cambiaron de estado.`);
  const seguros = await actualizarEstadosMoraSeguros(afiliadosRepo, pagosSeguroRepo, metadataIA("scheduler", "scheduler-mora-seguros"));
  console.log(`actualizarEstadosMoraSeguros: ${seguros} seguros cambiaron de estado.`);
});