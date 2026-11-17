import { Pago } from "../../domain/entities/pago";
import { parsearFechaValida } from "../../domain/value-objects/fecha";
import { MetadataCambio } from "../../domain/value-objects/metadata-cambio";
import { claveDePeriodo } from "../../domain/value-objects/mora";
import { PagosRepository } from "../ports/pagos.repository";
import { AfiliadosRepository } from "../ports/afiliados.repository";
import { recalcularAfiliadoDesdePagos, Recalcular } from "./recalcularAfiliadoDesdePagos";

export interface RegistrarPagoInput {
  afiliadoId: string;
  sede: string;
  fecha: string;
  valor: number;
  periodoCubierto: string;
  comprobanteURL?: string;
  numeroRecibo?: string;
}

export async function registrarPago(
  pagosRepo: PagosRepository,
  afiliadosRepo: AfiliadosRepository,
  input: RegistrarPagoInput,
  metadata: MetadataCambio,
  recalcular: Recalcular = recalcularAfiliadoDesdePagos
): Promise<Pago> {
  const fecha = parsearFechaValida(input.fecha, "fecha del pago");
  if (!input.valor || input.valor <= 0) throw new Error("Ingresa el valor pagado.");
  const periodo = claveDePeriodo(input.periodoCubierto, fecha);
  if (!periodo) throw new Error("Elige el mes que cubre este pago.");

  const existentes = await pagosRepo.listarPorAfiliado(input.afiliadoId);
  const yaExiste = existentes.some((p) => claveDePeriodo(p.periodoCubierto, p.fecha) === periodo);
  if (yaExiste) {
    throw new Error(`Ya existe un pago que cubre ese mes. Edita el pago existente en vez de crear uno nuevo.`);
  }

  const pago = await pagosRepo.crear({
    afiliadoId: input.afiliadoId,
    sede: input.sede,
    fecha,
    valor: input.valor,
    periodoCubierto: periodo,
    comprobanteURL: input.comprobanteURL,
    numeroRecibo: input.numeroRecibo?.trim() || undefined,
    metadata,
  });

  await recalcular(afiliadosRepo, pagosRepo, input.afiliadoId, metadata);
  return pago;
}