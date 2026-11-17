import { Beneficiario } from "../entities/afiliado";
import { estaRetirado } from "./estado-beneficiario";

export const LIMITE_BENEFICIARIOS_POR_ANIO = 7;
export const LIMITE_BENEFICIARIOS_PLAN_INTEGRAL = 8;
/** Lo que se suma a la cuota mensual por cada beneficiario por encima del cupo. */
export const VALOR_BENEFICIARIO_ADICIONAL = 10000;

export function contarBeneficiariosQueOcupanCupo(beneficiarios: Beneficiario[], anioReferencia: number): number {
  return beneficiarios.filter((b) => {
    if (b.adicional) return false; // los adicionales pagan aparte, no ocupan cupo
    if (estaRetirado(b)) return false; // el retiro libera el cupo
    if (!b.fallecido) return true;
    return b.fechaFallecimiento?.getFullYear() === anioReferencia;
  }).length;
}

/** Cupos sin costo extra: el plan integral de la sede Pelaya tiene 8; todo lo demás, 7. */
export function limiteBeneficiariosDelPlan(nombrePlan: string | undefined, sede: string | undefined): number {
  const sinTildes = (t: string | undefined) => (t ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const esIntegralPelaya = sinTildes(nombrePlan).includes("integral") && sinTildes(sede) === "pelaya";
  return esIntegralPelaya ? LIMITE_BENEFICIARIOS_PLAN_INTEGRAL : LIMITE_BENEFICIARIOS_POR_ANIO;
}

/** Adicionales que hoy suman a la cuota (los retirados o fallecidos dejan de cobrarse). */
export function contarAdicionalesActivos(beneficiarios: Beneficiario[]): number {
  return beneficiarios.filter((b) => b.adicional && !b.fallecido && !estaRetirado(b)).length;
}

/** Cuánto cambia la cuota mensual al pasar de una lista de beneficiarios a otra. */
export function ajusteCuotaPorAdicionales(antes: Beneficiario[], despues: Beneficiario[]): number {
  return (contarAdicionalesActivos(despues) - contarAdicionalesActivos(antes)) * VALOR_BENEFICIARIO_ADICIONAL;
}
