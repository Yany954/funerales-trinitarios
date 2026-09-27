import { Afiliado } from "../../domain/entities/afiliado";
import { MetadataCambio } from "../../domain/value-objects/metadata-cambio";
import { AfiliadosRepository } from "../ports/afiliados.repository";

export interface RegistrarFallecimientoBeneficiarioInput {
  afiliadoId: string;
  cedulaBeneficiario: string;
  fechaFallecimiento: string;
  certificadoDefuncionURL: string;
}

function normalizar(cedula: string): string {
  return cedula.trim().replace(/\s+/g, "");
}

export async function registrarFallecimientoBeneficiario(
  repo: AfiliadosRepository,
  input: RegistrarFallecimientoBeneficiarioInput,
  metadata: MetadataCambio
): Promise<Afiliado> {
  const actual = await repo.obtenerPorId(input.afiliadoId);
  if (!actual) throw new Error("Ese afiliado no existe.");

  const cedulaBuscada = normalizar(input.cedulaBeneficiario);
  const existe = actual.beneficiarios.some((b) => normalizar(b.cedula) === cedulaBuscada);
  if (!existe) {
    throw new Error(
      `No se encontró un beneficiario con cédula "${input.cedulaBeneficiario}". Cédulas registradas: ${actual.beneficiarios.map((b) => b.cedula).join(", ") || "ninguna"}.`
    );
  }

  const beneficiariosActualizados = actual.beneficiarios.map((b) =>
    normalizar(b.cedula) === cedulaBuscada
      ? { ...b, fallecido: true, fechaFallecimiento: new Date(input.fechaFallecimiento), certificadoDefuncionURL: input.certificadoDefuncionURL }
      : b
  );

  return repo.actualizar(input.afiliadoId, { beneficiarios: beneficiariosActualizados, metadata });
}