import { VistaAfiliado } from "../../domain/entities/vista-afiliado";

/** Puerto: la vista de solo lectura que consume la app del titular. */
export interface VistaAfiliadoRepository {
  guardar(vista: VistaAfiliado): Promise<void>;
  eliminar(afiliadoId: string): Promise<void>;
}
