import { getStorage, getDownloadURL } from "firebase-admin/storage";
import "./admin"; // asegura initializeApp()
import { ArchivosService } from "../../application/ports/archivos.service";

const MAX_BYTES = 5 * 1024 * 1024;

export class ArchivosStorage implements ArchivosService {
  async esImagenValida(ruta: string): Promise<boolean> {
    const archivo = getStorage().bucket().file(ruta);
    const [existe] = await archivo.exists();
    if (!existe) return false;
    const [meta] = await archivo.getMetadata();
    return String(meta.contentType ?? "").startsWith("image/") && Number(meta.size ?? 0) <= MAX_BYTES;
  }

  async urlDescarga(ruta: string): Promise<string> {
    return getDownloadURL(getStorage().bucket().file(ruta));
  }
}
