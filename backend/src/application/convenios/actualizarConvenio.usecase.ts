import { Convenio } from "../../domain/entities/convenio";
import { MetadataCambio } from "../../domain/value-objects/metadata-cambio";
import { ConveniosRepository } from "../ports/convenios.repository";

export interface ActualizarConvenioInput {
  id: string;
  nombre?: string;
  tipo?: Convenio["tipo"];
  numeroContrato?: string;
  coberturaGeografica?: string[];
}

export async function actualizarConvenio(
  repo: ConveniosRepository,
  input: ActualizarConvenioInput,
  metadata: MetadataCambio
): Promise<Convenio> {
  const { id, ...cambios } = input;
  return repo.actualizar(id, { ...cambios, metadata });
}