import { Flor } from "../../domain/entities/flor";
import { MetadataCambio } from "../../domain/value-objects/metadata-cambio";
import { FloresRepository } from "../ports/flores.repository";

export interface CrearFlorInput {
  nombre: string;
  precioCosto: number;
  precioPublico: number;
  fotoURL?: string;
}

export async function crearFlor(repo: FloresRepository, input: CrearFlorInput, metadata: MetadataCambio): Promise<Flor> {
  return repo.crear({ ...input, metadata });
}