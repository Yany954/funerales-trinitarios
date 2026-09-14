import { InventarioCofre } from "../../domain/entities/inventario-cofre";
export interface InventarioRepository {
  actualizarCantidad(sede: string, tipoCofreId: string, cantidad: number, metadata: import("../../domain/value-objects/metadata-cambio").MetadataCambio): Promise<InventarioCofre>;
  listarPorSede(sede: string): Promise<InventarioCofre[]>;
}