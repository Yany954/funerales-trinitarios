import { Afiliado } from "../../domain/entities/afiliado";
import { MetadataCambio } from "../../domain/value-objects/metadata-cambio";
import { estadoSegunMora, periodoMasReciente } from "../../domain/value-objects/mora";
import { AfiliadosRepository } from "../ports/afiliados.repository";
import { PagosRepository } from "../ports/pagos.repository";

export async function recalcularAfiliadoDesdePagos(
  afiliadosRepo: AfiliadosRepository,
  pagosRepo: PagosRepository,
  afiliadoId: string,
  metadata: MetadataCambio
): Promise<void> {
  const afiliado = await afiliadosRepo.obtenerPorId(afiliadoId);
  if (!afiliado) return;

  const pagos = await pagosRepo.listarPorAfiliado(afiliadoId); // el más reciente primero
  const hasta = periodoMasReciente(pagos);
  const ultimo = pagos[0];

  const cambios: Partial<Omit<Afiliado, "id">> = {
    ultimoPago: ultimo ? { fecha: ultimo.fecha, valor: ultimo.valor, metodo: "registrado" } : null,
    periodoCubiertoHasta: hasta ?? null,
    metadata,
  };
  if (afiliado.estadoPlan !== "inactivo" && afiliado.fechaAfiliacionReal) {
    cambios.estadoPlan = estadoSegunMora(afiliado.fechaAfiliacionReal, hasta);
  }
  await afiliadosRepo.actualizar(afiliadoId, cambios);
}