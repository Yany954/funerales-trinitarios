import { Afiliado, Beneficiario, BeneficiarioEntrada } from "../../domain/entities/afiliado";
import { MetadataCambio } from "../../domain/value-objects/metadata-cambio";
import { AfiliadosRepository } from "../ports/afiliados.repository";
import { LIMITE_BENEFICIARIOS_POR_ANIO, contarBeneficiariosQueOcupanCupo } from "../../domain/value-objects/cupo-beneficiarios";

export interface ActualizarBeneficiariosInput {
  afiliadoId: string;
  beneficiarios: BeneficiarioEntrada[];
}

export async function actualizarBeneficiarios(
  repo: AfiliadosRepository,
  input: ActualizarBeneficiariosInput,
  metadata: MetadataCambio
): Promise<Afiliado> {
  const actual = await repo.obtenerPorId(input.afiliadoId);
  if (!actual) throw new Error("Ese afiliado no existe.");

  const existentesPorCedula = new Map(actual.beneficiarios.map((b) => [b.cedula, b]));
  const ahora = new Date();

  const beneficiariosNuevos: Beneficiario[] = input.beneficiarios.map((entrada) => {
    const existente = existentesPorCedula.get(entrada.cedula);
    if (existente) {
      // Conserva fecha de alta y estado de fallecimiento — editar el
      // nombre no debe borrar ese historial.
      return { ...existente, nombre: entrada.nombre, parentesco: entrada.parentesco };
    }
    return { ...entrada, fechaAdicion: ahora };
  });

  const ocupados = contarBeneficiariosQueOcupanCupo(beneficiariosNuevos, ahora.getFullYear());
  if (ocupados > LIMITE_BENEFICIARIOS_POR_ANIO) {
    throw new Error(`El límite es de ${LIMITE_BENEFICIARIOS_POR_ANIO} beneficiarios por año. Esta lista tendría ${ocupados}.`);
  }

  const actualizado = await repo.actualizar(input.afiliadoId, { beneficiarios: beneficiariosNuevos, metadata });
  await repo.sincronizarPersonasCubiertas(actualizado);
  return actualizado;
}