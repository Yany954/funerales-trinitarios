import { MetadataCambio } from "../../domain/value-objects/metadata-cambio";
import { PagosRepository } from "../ports/pagos.repository";
import { AfiliadosRepository } from "../ports/afiliados.repository";
import { recalcularAfiliadoDesdePagos, Recalcular } from "./recalcularAfiliadoDesdePagos";

export async function eliminarPago(
  pagosRepo: PagosRepository,
  afiliadosRepo: AfiliadosRepository,
  id: string,
  metadata: MetadataCambio,
  recalcular: Recalcular = recalcularAfiliadoDesdePagos
): Promise<void> {
  const pago = await pagosRepo.obtenerPorId(id);
  if (!pago) throw new Error("Ese pago no existe.");
  await pagosRepo.eliminar(id);
  await recalcular(afiliadosRepo, pagosRepo, pago.afiliadoId, metadata);
}