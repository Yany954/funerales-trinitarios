import { Flor } from "../../domain/entities/flor";
import { MetadataCambio } from "../../domain/value-objects/metadata-cambio";
import { FloresRepository } from "../ports/flores.repository";

export interface ActualizarFlorInput {
  id: string;
  nombre?: string;
  precioCosto?: number;
  precioPublico?: number;
  fotoURL?: string;
}

export async function actualizarFlor(
  repo: FloresRepository,
  input: ActualizarFlorInput,
  metadata: MetadataCambio
): Promise<Flor> {
  const { id, ...cambios } = input;
  return repo.actualizar(id, { ...cambios, metadata });
}