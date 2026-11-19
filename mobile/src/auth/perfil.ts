import { httpsCallable } from "firebase/functions";
import { ref, uploadBytes } from "firebase/storage";
import { functions, storage } from "@/firebase/config";

/** Guarda el celular (o lo quita con ""). El backend valida y lo guarda en el afiliado. */
export async function guardarCelular(celular: string): Promise<void> {
  await httpsCallable(functions, "actualizarPerfilAfiliadoFn")({ celular });
}

/**
 * Sube la foto a perfiles/{afiliadoId}/ (las reglas de Storage solo permiten
 * su propia carpeta) y le pide al backend que la ponga como foto de perfil.
 */
export async function subirFotoPerfil(afiliadoId: string, uri: string, tipo = "image/jpeg"): Promise<void> {
  const archivo = await (await fetch(uri)).blob();
  const ruta = `perfiles/${afiliadoId}/perfil-${Date.now()}.jpg`;
  await uploadBytes(ref(storage, ruta), archivo, { contentType: tipo });
  await httpsCallable(functions, "actualizarPerfilAfiliadoFn")({ fotoPerfilRuta: ruta });
}
