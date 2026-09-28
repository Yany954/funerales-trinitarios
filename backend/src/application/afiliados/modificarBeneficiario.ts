import { Afiliado, Beneficiario } from "../../domain/entities/afiliado";
import { MetadataCambio } from "../../domain/value-objects/metadata-cambio";
import { claveBeneficiario } from "../../domain/value-objects/beneficiario-clave";
import { LIMITE_BENEFICIARIOS_POR_ANIO, contarBeneficiariosQueOcupanCupo } from "../../domain/value-objects/cupo-beneficiarios";
import { AfiliadosRepository } from "../ports/afiliados.repository";

export interface IdentificadorBeneficiario {
  afiliadoId: string;
  cedulaBeneficiario: string;
  nombreBeneficiario?: string;
}

export async function modificarBeneficiario(
  repo: AfiliadosRepository,
  input: IdentificadorBeneficiario,
  metadata: MetadataCambio,
  transformar: (b: Beneficiario) => Beneficiario,
  opciones?: { verificarCupo?: boolean }
): Promise<Afiliado> {
  const actual = await repo.obtenerPorId(input.afiliadoId);
  if (!actual) throw new Error("Ese afiliado no existe.");

  const clave = claveBeneficiario({ cedula: input.cedulaBeneficiario, nombre: input.nombreBeneficiario ?? "" });
  if (!actual.beneficiarios.some((b) => claveBeneficiario(b) === clave)) {
    throw new Error("No se encontró ese beneficiario en este afiliado.");
  }

  const beneficiarios = actual.beneficiarios.map((b) => (claveBeneficiario(b) === clave ? transformar(b) : b));

  if (opciones?.verificarCupo) {
    const ocupados = contarBeneficiariosQueOcupanCupo(beneficiarios, new Date().getFullYear());
    if (ocupados > LIMITE_BENEFICIARIOS_POR_ANIO) {
      throw new Error(`Reactivarlo superaría el límite de ${LIMITE_BENEFICIARIOS_POR_ANIO} beneficiarios. Retira o inactiva a otro primero.`);
    }
  }

  const actualizado = await repo.actualizar(input.afiliadoId, { beneficiarios, metadata });
  await repo.sincronizarPersonasCubiertas(actualizado);
  return actualizado;
}