import { Afiliado } from "../../domain/entities/afiliado";
import { MetadataCambio } from "../../domain/value-objects/metadata-cambio";
import { AfiliadosRepository } from "../ports/afiliados.repository";
import { parsearFechaValida } from "../../domain/value-objects/fecha";

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
  ubicacion?: string; // "" = quitar (queda la sede)
  observaciones?: string;
}

export async function actualizarAfiliado(
  repo: AfiliadosRepository,
  input: ActualizarAfiliadoInput,
  metadata: MetadataCambio
): Promise<Afiliado> {
const { id, fechaAfiliacionReal, fechaNacimiento, ...resto } = input;
const cambios: Partial<Omit<Afiliado, "id">> = { ...resto, metadata };
if (fechaAfiliacionReal) cambios.fechaAfiliacionReal = parsearFechaValida(fechaAfiliacionReal, "fecha de afiliación");
if (fechaNacimiento) cambios.fechaNacimiento = parsearFechaValida(fechaNacimiento, "fecha de nacimiento");

  const actualizado = await repo.actualizar(id, cambios);
  if ((input.nombreCompleto || input.cedula) && !actualizado.soloSeguro) {
    await repo.sincronizarPersonasCubiertas(actualizado);
  }
  return actualizado;
}