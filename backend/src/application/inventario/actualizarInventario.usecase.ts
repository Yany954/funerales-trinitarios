import { InventarioCofre } from "../../domain/entities/inventario-cofre";
import { MetadataCambio } from "../../domain/value-objects/metadata-cambio";
import { InventarioRepository } from "../ports/inventario.repository";

export interface ActualizarInventarioInput {
  sede: string;
  tipoCofreId: string;
  cantidadDisponible: number;
}

export async function actualizarInventario(
  repo: InventarioRepository,
  input: ActualizarInventarioInput,
  metadata: MetadataCambio
): Promise<InventarioCofre> {
  return repo.actualizarCantidad(input.sede, input.tipoCofreId, input.cantidadDisponible, metadata);
}