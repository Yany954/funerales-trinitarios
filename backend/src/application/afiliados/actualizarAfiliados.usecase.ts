import { Afiliado } from "../../domain/entities/afiliado";
import { MetadataCambio } from "../../domain/value-objects/metadata-cambio";
import { AfiliadosRepository } from "../ports/afiliados.repository";

export interface ActualizarAfiliadoInput {
  id: string;
  nombreCompleto?: string;
  cedula?: string;
  numeroContrato?: string;
  planId?: string;
  fechaAfiliacionReal?: string;
  valorCuotaMensual?: number;
  tieneSeguroVida?: boolean;
  aseguradora?: string;
  fechaNacimiento?: string;
  vereda?: string;
  observaciones?: string;
}

export async function actualizarAfiliado(
  repo: AfiliadosRepository,
  input: ActualizarAfiliadoInput,
  metadata: MetadataCambio
): Promise<Afiliado> {
const { id, fechaAfiliacionReal, fechaNacimiento, ...resto } = input;
const cambios: Partial<Omit<Afiliado, "id">> = { ...resto, metadata };
if (fechaAfiliacionReal) cambios.fechaAfiliacionReal = new Date(fechaAfiliacionReal);
if (fechaNacimiento) cambios.fechaNacimiento = new Date(fechaNacimiento);

  const actualizado = await repo.actualizar(id, cambios);
  if (input.nombreCompleto || input.cedula) {
    await repo.sincronizarPersonasCubiertas(actualizado);
  }
  return actualizado;
}