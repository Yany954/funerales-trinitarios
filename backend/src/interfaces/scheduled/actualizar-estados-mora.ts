import { onSchedule } from "firebase-functions/v2/scheduler";
import { AfiliadosRepositoryFirestore } from "../../infrastructure/firebase/afiliados.repository.firestore";
import { PagosRepositoryFirestore } from "../../infrastructure/firebase/pago.repository.firestore";
import { actualizarEstadosMora } from "../../application/pagos/actualizarEstadosMora.usecase";
import { metadataIA } from "../../domain/value-objects/metadata-cambio";

const afiliadosRepo = new AfiliadosRepositoryFirestore();
const pagosRepo = new PagosRepositoryFirestore();

export const actualizarEstadosMoraFn = onSchedule("every day 06:00", async () => {
  const actualizados = await actualizarEstadosMora(afiliadosRepo, pagosRepo, metadataIA("scheduler", "scheduler-mora-afiliados"));
  console.log(`actualizarEstadosMora: ${actualizados} afiliados cambiaron de estado.`);
});