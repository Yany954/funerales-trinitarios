import { Afiliado } from "../../domain/entities/afiliado";
import { MetadataCambio } from "../../domain/value-objects/metadata-cambio";
import { AfiliadosRepository } from "../ports/afiliados.repository";
import { PlanesRepository } from "../ports/planes.repository";

export interface ActualizarAfiliadoInput {
  id: string;
  nombreCompleto?: string;
  cedula?: string;
  numeroContrato?: string;
  planId?: string;
  anioAfiliacion?: number;
  tieneSeguroVida?: boolean;
  aseguradora?: string;
  observaciones?: string;
}

export async function actualizarAfiliado(
  repo: AfiliadosRepository,
  planesRepo: PlanesRepository,
  input: ActualizarAfiliadoInput,
  metadata: MetadataCambio
): Promise<Afiliado> {
  const { id, planId, anioAfiliacion, ...resto } = input;
  const cambios: Partial<Omit<Afiliado, "id">> = { ...resto, metadata };

  // Si cambia el plan o el año, la cuota fija se recalcula — nunca queda
  // "vieja" sin que alguien lo note.
  if (planId || anioAfiliacion) {
    const actual = await repo.obtenerPorId(id);
    if (!actual) throw new Error("Ese afiliado no existe.");
    const planFinal = planId ?? actual.planId;
    const anioFinal = anioAfiliacion ?? actual.anioAfiliacion;
    const valorCuotaMensual = await planesRepo.obtenerTarifaVigente(planFinal, anioFinal);
    if (valorCuotaMensual === null) {
      throw new Error("Ese plan no tiene ninguna tarifa registrada para ese año o anteriores.");
    }
    cambios.planId = planFinal;
    cambios.anioAfiliacion = anioFinal;
    cambios.valorCuotaMensual = valorCuotaMensual;
  }

  const actualizado = await repo.actualizar(id, cambios);
  if (input.nombreCompleto || input.cedula) {
    await repo.sincronizarPersonasCubiertas(actualizado);
  }
  return actualizado;
}