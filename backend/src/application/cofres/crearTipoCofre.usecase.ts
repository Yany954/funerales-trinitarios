import { TipoCofre } from "../../domain/entities/cofre";
import { MetadataCambio } from "../../domain/value-objects/metadata-cambio";
import { CofresRepository } from "../ports/cofres.repository";

export interface CrearTipoCofreInput {
  categoria: TipoCofre["categoria"];
  nivel?: TipoCofre["nivel"];
  tamanoCm?: number;
  referencia: string;
  precio: number;
  fotoURL?: string;
  descripcion?: string;
}

export async function crearTipoCofre(
  repo: CofresRepository,
  input: CrearTipoCofreInput,
  metadata: MetadataCambio
): Promise<TipoCofre> {
  return repo.crear({ ...input, metadata });
}