import { ItemBoveda } from "../../domain/entities/item-boveda";

export interface ItemBovedaRepository {
  crear(item: Omit<ItemBoveda, "id">): Promise<ItemBoveda>;
  listar(): Promise<ItemBoveda[]>;
  obtenerPorId(id: string): Promise<ItemBoveda | null>;
  actualizar(id: string, cambios: Partial<Omit<ItemBoveda, "id">>): Promise<ItemBoveda>;
  eliminar(id: string): Promise<void>;
}