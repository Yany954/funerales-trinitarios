import { Beneficiario } from "../entities/afiliado";

export const LIMITE_BENEFICIARIOS_POR_ANIO = 7;

/**
 * Cuenta cuántos beneficiarios "ocupan cupo" en un año dado. Un beneficiario
 * vivo siempre ocupa cupo. Uno fallecido solo ocupa cupo durante el año en
 * que falleció — a partir del año siguiente, deja de contar.
 */
export function contarBeneficiariosQueOcupanCupo(beneficiarios: Beneficiario[], anioReferencia: number): number {
  return beneficiarios.filter((b) => {
    if (!b.fallecido) return true;
    return b.fechaFallecimiento?.getFullYear() === anioReferencia;
  }).length;
}