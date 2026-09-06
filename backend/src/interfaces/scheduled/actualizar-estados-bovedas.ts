import { onSchedule } from "firebase-functions/v2/scheduler";
import { BovedaRepositoryFirestore } from "../../infrastructure/firebase/boveda.repository.firebase";
import { metadataIA } from "../../domain/value-objects/metadata-cambio";
import { actualizarEstadosVencimiento } from "../../application/boveda/actualizarEstadosVencimiento.usecase";
const repo = new BovedaRepositoryFirestore();
export const actualizarEstadosBovedasFn = onSchedule("every day 06:00", async () => {
  const metadataSistema = metadataIA("whatsapp-bot", "system-scheduler");
  try {
    await actualizarEstadosVencimiento(repo, metadataSistema);
    console.log("Estados de bóvedas actualizados correctamente.");
  } catch (error) {
    console.error("Error al actualizar estados de bóvedas:", error);
    throw error;
  }
});