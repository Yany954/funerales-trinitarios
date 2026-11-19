import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireAfiliado } from "../../infrastructure/auth/rbac";
import { AfiliadosRepositoryFirestore } from "../../infrastructure/firebase/afiliados.repository.firestore";
import { ArchivosStorage } from "../../infrastructure/firebase/archivos.storage";
import { metadataAfiliado } from "../../domain/value-objects/metadata-cambio";
import { ErrorRegistro } from "../../application/cuentas-afiliado/registrarCuentaAfiliado.usecase";
import {
  actualizarPerfilAfiliado,
  ActualizarPerfilAfiliadoInput,
} from "../../application/cuentas-afiliado/actualizarPerfilAfiliado.usecase";

const afiliados = new AfiliadosRepositoryFirestore();
const archivos = new ArchivosStorage();

/** El titular cambia su celular o su foto de perfil. El afiliadoId sale del token, nunca del input. */
export const actualizarPerfilAfiliadoFn = onCall<ActualizarPerfilAfiliadoInput>(async (request) => {
  const { uid, afiliadoId } = requireAfiliado(request);
  const d = request.data ?? {};
  const input: ActualizarPerfilAfiliadoInput = {
    celular: typeof d.celular === "string" ? d.celular : undefined,
    fotoPerfilRuta: typeof d.fotoPerfilRuta === "string" ? d.fotoPerfilRuta : undefined,
  };
  try {
    await actualizarPerfilAfiliado(afiliados, archivos, afiliadoId, input, metadataAfiliado(uid));
    return { ok: true };
  } catch (err) {
    if (err instanceof ErrorRegistro) throw new HttpsError("failed-precondition", err.message);
    console.error("actualizarPerfilAfiliadoFn:", err instanceof Error ? err.message : err);
    throw new HttpsError("internal", "No pudimos guardar tus datos. Intenta de nuevo.");
  }
});
