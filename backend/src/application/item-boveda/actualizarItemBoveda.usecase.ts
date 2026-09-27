import { ItemBoveda } from "../../domain/entities/item-boveda";
import { MetadataCambio } from "../../domain/value-objects/metadata-cambio";
import { ItemBovedaRepository } from "../ports/item-boveda.repository";

export interface ActualizarItemBovedaInput { id: string; nombre?: string; zona?: string; precio?: number; }

export async function actualizarItemBoveda(repo: ItemBovedaRepository, input: ActualizarItemBovedaInput, metadata: MetadataCambio): Promise<ItemBoveda> {
  const { id, ...cambios } = input;
  return repo.actualizar(id, { ...cambios, metadata });
}