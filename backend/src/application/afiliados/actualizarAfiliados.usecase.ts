import { Afiliado } from "../../domain/entities/afiliado";
import { MetadataCambio } from "../../domain/value-objects/metadata-cambio";
import { AfiliadosRepository } from "../ports/afiliados.repository";

export interface ActualizarAfiliadoInput {
  id: string;
  nombreCompleto?: string;
  cedula?: string;
  numeroContrato?: string;
  planId?: string;
  tieneSeguroVida?: boolean;
  aseguradora?: string;
  observaciones?: string;
}

export async function actualizarAfiliado(
  repo: AfiliadosRepository,
  input: ActualizarAfiliadoInput,
  metadata: MetadataCambio
): Promise<Afiliado> {
  const { id, ...cambios } = input;
  const actualizado = await repo.actualizar(id, { ...cambios, metadata });

  // Si cambió el nombre o la cédula, el índice de búsqueda debe reflejarlo.
  if (input.nombreCompleto || input.cedula) {
    await repo.sincronizarPersonasCubiertas(actualizado);
  }

  return actualizado;
}