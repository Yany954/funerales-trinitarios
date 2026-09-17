import { Afiliado, Beneficiario } from "../../domain/entities/afiliado";
import { MetadataCambio } from "../../domain/value-objects/metadata-cambio";
import { AfiliadosRepository } from "../ports/afiliados.repository";

export interface ActualizarBeneficiariosInput {
  afiliadoId: string;
  beneficiarios: Beneficiario[];
}

export async function actualizarBeneficiarios(
  repo: AfiliadosRepository,
  input: ActualizarBeneficiariosInput,
  metadata: MetadataCambio
): Promise<Afiliado> {
  const actualizado = await repo.actualizar(input.afiliadoId, { beneficiarios: input.beneficiarios, metadata });
  await repo.sincronizarPersonasCubiertas(actualizado); // re-indexa personas_cubiertas con la lista nueva
  return actualizado;
}