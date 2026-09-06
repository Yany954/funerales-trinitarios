import { onCall } from "firebase-functions/v2/https";
import { requireAuth } from "../../infrastructure/auth/rbac";
import { BovedaRepositoryFirestore } from "../../infrastructure/firebase/boveda.repository.firebase";
import {listarBovedasPorEstado} from "../../application/boveda/listarBovedasPorEstado.usecase";
import { registrarBoveda } from "../../application/boveda/registrarBoveda.usecase";
import { metadataHumano } from "../../domain/value-objects/metadata-cambio";
import { RegistrarBovedaInput } from "../../application/boveda/registrarBoveda.usecase";
import { EstadoBoveda } from "../../domain/entities/boveda";

const repo = new BovedaRepositoryFirestore();

/** El dashboard llama esto para crear una boveda nueva. */
export const registrarBovedaFn = onCall<RegistrarBovedaInput>(async (request) => {
  const uid = requireAuth(request);
  const boveda = await registrarBoveda(repo, request.data, metadataHumano(uid));
  return { boveda };
});

/** El dashboard (y en el futuro el bot de WhatsApp) llama esto para saber si alguien tiene plan. */
export const listarBovedasPorEstadoFn = onCall<{ estado: EstadoBoveda }>(async (request) => {
  requireAuth(request);
  const bovedas = await listarBovedasPorEstado(repo, request.data.estado);
  return { bovedas };
});

