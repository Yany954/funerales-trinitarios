import { Convenio } from "../../domain/entities/convenio";
import { MetadataCambio } from "../../domain/value-objects/metadata-cambio";
import { ConveniosRepository } from "../ports/convenios.repository";

export interface CrearConvenioInput {
  nombre: string;
  tipo: Convenio["tipo"];
  numeroContrato?: string;
  coberturaGeografica: string[];
}

export async function crearConvenio(
  repo: ConveniosRepository,
  input: CrearConvenioInput,
  metadata: MetadataCambio
): Promise<Convenio> {
  return repo.crear({ ...input, metadata });
}