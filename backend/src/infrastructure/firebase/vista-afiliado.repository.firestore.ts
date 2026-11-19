import { db } from "./admin";
import { VistaAfiliadoRepository } from "../../application/ports/vista-afiliado.repository";
import { VistaAfiliado } from "../../domain/entities/vista-afiliado";

export const COLECCION_VISTA_AFILIADO = "vista_afiliado";

export class VistaAfiliadoRepositoryFirestore implements VistaAfiliadoRepository {
  async guardar(vista: VistaAfiliado): Promise<void> {
    // set() completo (no merge): si algo se quitó en el afiliado, también se quita aquí.
    await db.collection(COLECCION_VISTA_AFILIADO).doc(vista.afiliadoId).set(vista);
  }

  async eliminar(afiliadoId: string): Promise<void> {
    await db.collection(COLECCION_VISTA_AFILIADO).doc(afiliadoId).delete();
  }
}
