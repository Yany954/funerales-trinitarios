import { Pago } from "../../domain/entities/pago";
import { MetadataCambio } from "../../domain/value-objects/metadata-cambio";
import { estadoSegunMora, periodoMasReciente } from "../../domain/value-objects/mora";
import { AfiliadosRepository } from "../ports/afiliados.repository";
import { PagosRepository } from "../ports/pagos.repository";

export async function actualizarEstadosMora(
  afiliadosRepo: AfiliadosRepository,
  pagosRepo: PagosRepository,
  metadata: MetadataCambio
): Promise<number> {
  const [afiliados, pagos] = await Promise.all([afiliadosRepo.listarTodos(), pagosRepo.listarTodos()]);

  const pagosPorAfiliado = new Map<string, Pago[]>();
  for (const p of pagos) {
    const lista = pagosPorAfiliado.get(p.afiliadoId) ?? [];
    lista.push(p);
    pagosPorAfiliado.set(p.afiliadoId, lista);
  }

  const hoy = new Date();
  let actualizados = 0;

  for (const afiliado of afiliados) {
    if (afiliado.estadoPlan === "inactivo" || !afiliado.fechaAfiliacionReal) continue;

    const hasta = periodoMasReciente(pagosPorAfiliado.get(afiliado.id) ?? []);
    const nuevoEstado = estadoSegunMora(afiliado.fechaAfiliacionReal, hasta, hoy);

    if (afiliado.estadoPlan !== nuevoEstado) {
      await afiliadosRepo.actualizarEstadoPlan(afiliado.id, nuevoEstado, metadata);
      actualizados++;
    }
  }
  return actualizados;
}