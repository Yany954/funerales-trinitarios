import { AfiliadosRepository } from "../ports/afiliados.repository";
import { MetadataCambio } from "../../domain/value-objects/metadata-cambio";

const DIAS_DE_GRACIA = 35; // un mes de plan + margen antes de marcar mora

export async function actualizarEstadosMora(repo: AfiliadosRepository, metadata: MetadataCambio): Promise<number> {
  const afiliados = await repo.listarTodos();
  const hoy = new Date();
  let actualizados = 0;

  for (const afiliado of afiliados) {
    if (afiliado.estadoPlan === "inactivo") continue; // no reactivamos a alguien que se dio de baja

    const fechaReferencia = afiliado.ultimoPago?.fecha ?? afiliado.fechaAfiliacion;
    const diasSinPagar = Math.floor((hoy.getTime() - fechaReferencia.getTime()) / (1000 * 60 * 60 * 24));
    const nuevoEstado = diasSinPagar > DIAS_DE_GRACIA ? "en mora" : "activo";

    if (afiliado.estadoPlan !== nuevoEstado) {
      await repo.actualizarEstadoPlan(afiliado.id, nuevoEstado, metadata);
      actualizados++;
    }
  }
  return actualizados;
}