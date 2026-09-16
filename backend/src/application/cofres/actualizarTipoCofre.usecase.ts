import { TipoCofre } from "../../domain/entities/cofre";
import { MetadataCambio } from "../../domain/value-objects/metadata-cambio";
import { CofresRepository } from "../ports/cofres.repository";

export interface ActualizarTipoCofreInput {
  id: string;
  categoria?: TipoCofre["categoria"];
  nivel?: TipoCofre["nivel"];
  tamanoCm?: number;
  referencia?: string;
  precio?: number;
  fotoURL?: string;
  descripcion?: string;
}

export async function actualizarTipoCofre(
  repo: CofresRepository,
  input: ActualizarTipoCofreInput,
  metadata: MetadataCambio
): Promise<TipoCofre> {
  const { id, ...cambios } = input;
  return repo.actualizar(id, { ...cambios, metadata });
}