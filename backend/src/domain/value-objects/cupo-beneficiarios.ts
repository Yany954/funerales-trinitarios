import { Beneficiario } from "../entities/afiliado";
import { estaRetirado } from "./estado-beneficiario";

export const LIMITE_BENEFICIARIOS_POR_ANIO = 7;

export function contarBeneficiariosQueOcupanCupo(beneficiarios: Beneficiario[], anioReferencia: number): number {
  return beneficiarios.filter((b) => {
    if (estaRetirado(b)) return false; // el retiro libera el cupo
    if (!b.fallecido) return true;
    return b.fechaFallecimiento?.getFullYear() === anioReferencia;
  }).length;
}