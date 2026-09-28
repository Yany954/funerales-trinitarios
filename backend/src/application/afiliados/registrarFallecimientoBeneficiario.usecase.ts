import { Afiliado } from "../../domain/entities/afiliado";
import { MetadataCambio } from "../../domain/value-objects/metadata-cambio";
import { AfiliadosRepository } from "../ports/afiliados.repository";
import { IdentificadorBeneficiario, modificarBeneficiario } from "./modificarBeneficiario";

export interface RegistrarFallecimientoBeneficiarioInput extends IdentificadorBeneficiario {
  fechaFallecimiento: string; // "yyyy-mm-dd"
  certificadoDefuncionURL: string;
}

export async function registrarFallecimientoBeneficiario(
  repo: AfiliadosRepository,
  input: RegistrarFallecimientoBeneficiarioInput,
  metadata: MetadataCambio
): Promise<Afiliado> {
  const fecha = new Date(input.fechaFallecimiento);
  if (isNaN(fecha.getTime())) throw new Error("La fecha de fallecimiento no es válida.");

  return modificarBeneficiario(repo, input, metadata, (b) => ({
    ...b,
    fallecido: true,
    fechaFallecimiento: fecha,
    certificadoDefuncionURL: input.certificadoDefuncionURL,
  }));
}