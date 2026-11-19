import { Afiliado } from "../../domain/entities/afiliado";
import { MetadataCambio } from "../../domain/value-objects/metadata-cambio";
import { AfiliadosRepository } from "../ports/afiliados.repository";
import { parsearFechaValida } from "../../domain/value-objects/fecha";
import { normalizarCelular } from "../../domain/value-objects/celular";

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
  celular?: string; // "" = quitar
  contratoFotos?: string[];
}

export async function actualizarAfiliado(
  repo: AfiliadosRepository,
  input: ActualizarAfiliadoInput,
  metadata: MetadataCambio
): Promise<Afiliado> {
const { id, fechaAfiliacionReal, fechaNacimiento, celular, ...resto } = input;
const cambios: Partial<Omit<Afiliado, "id">> = { ...resto, metadata };
if (celular !== undefined) {
  const limpio = celular.trim() === "" ? "" : normalizarCelular(celular);
  if (limpio === null) throw new Error("El celular debe tener 10 números y empezar por 3.");
  cambios.celular = limpio;
}
if (fechaAfiliacionReal) cambios.fechaAfiliacionReal = parsearFechaValida(fechaAfiliacionReal, "fecha de afiliación");
if (fechaNacimiento) cambios.fechaNacimiento = parsearFechaValida(fechaNacimiento, "fecha de nacimiento");

  const actualizado = await repo.actualizar(id, cambios);
  if ((input.nombreCompleto || input.cedula) && !actualizado.soloSeguro) {
    await repo.sincronizarPersonasCubiertas(actualizado);
  }
  return actualizado;
}