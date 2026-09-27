import { ItemBoveda } from "../../domain/entities/item-boveda";
import { MetadataCambio } from "../../domain/value-objects/metadata-cambio";
import { ItemBovedaRepository } from "../ports/item-boveda.repository";

export interface CrearItemBovedaInput { nombre: string; zona: string; precio: number; }

export async function crearItemBoveda(repo: ItemBovedaRepository, input: CrearItemBovedaInput, metadata: MetadataCambio): Promise<ItemBoveda> {
  return repo.crear({ ...input, metadata });
}