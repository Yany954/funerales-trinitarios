import type { Beneficiario } from "../types";

export const LIMITE_BENEFICIARIOS_POR_ANIO = 7;

function anioDe(valor: unknown): number | undefined {
  if (!valor) return undefined;
  const conToDate = valor as { toDate?: () => Date };
  const fecha = conToDate.toDate ? conToDate.toDate() : new Date(valor as string);
  return isNaN(fecha.getTime()) ? undefined : fecha.getFullYear();
}

export function contarBeneficiariosQueOcupanCupo(beneficiarios: Beneficiario[], anioReferencia: number): number {
  return beneficiarios.filter((b) => !b.fallecido || anioDe(b.fechaFallecimiento) === anioReferencia).length;
}