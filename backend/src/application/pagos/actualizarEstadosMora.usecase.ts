import { AfiliadosRepository } from "../ports/afiliados.repository";
import { MetadataCambio } from "../../domain/value-objects/metadata-cambio";

/**
 * La cuota vence exactamente un mes después de la fecha base (fecha de
 * afiliación, o la fecha del último pago si ya pagó alguna vez) — mismo
 * día del mes siguiente. Se da 1 día de gracia después de esa fecha; pasado
 * ese día sin pago, el afiliado queda "en mora".
 */
function calcularFechaVencimiento(fechaBase: Date): Date {
  const vencimiento = new Date(fechaBase);
  vencimiento.setMonth(vencimiento.getMonth() + 1);
  return vencimiento;
}

function estaEnMora(fechaBase: Date, hoy: Date): boolean {
  const vencimiento = calcularFechaVencimiento(fechaBase);
  const limiteConGracia = new Date(vencimiento);
  limiteConGracia.setDate(limiteConGracia.getDate() + 1);
  return hoy.getTime() > limiteConGracia.getTime();
}

export async function actualizarEstadosMora(repo: AfiliadosRepository, metadata: MetadataCambio): Promise<number> {
  const afiliados = await repo.listarTodos();
  const hoy = new Date();
  let actualizados = 0;

  for (const afiliado of afiliados) {
    if (afiliado.estadoPlan === "inactivo") continue; // no tocar a quien se dio de baja voluntariamente

    const fechaBase = afiliado.ultimoPago?.fecha ?? afiliado.fechaAfiliacionReal;
    const nuevoEstado = estaEnMora(fechaBase, hoy) ? "en mora" : "activo";

    if (afiliado.estadoPlan !== nuevoEstado) {
      await repo.actualizarEstadoPlan(afiliado.id, nuevoEstado, metadata);
      actualizados++;
    }
  }
  return actualizados;
}