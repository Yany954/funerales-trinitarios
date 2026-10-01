import { Pago } from "../../domain/entities/pago";
import { MetadataCambio } from "../../domain/value-objects/metadata-cambio";
import { claveDePeriodo } from "../../domain/value-objects/mora";
import { PagosRepository } from "../ports/pagos.repository";
import { AfiliadosRepository } from "../ports/afiliados.repository";
import { recalcularAfiliadoDesdePagos } from "./recalcularAfiliadoDesdePagos";

export interface ActualizarPagoInput {
  id: string;
  fecha?: string;
  valor?: number;
  periodoCubierto?: string;
  comprobanteURL?: string;
  numeroRecibo?: string;
}

export async function actualizarPago(
  pagosRepo: PagosRepository,
  afiliadosRepo: AfiliadosRepository,
  input: ActualizarPagoInput,
  metadata: MetadataCambio
): Promise<Pago> {
  const actual = await pagosRepo.obtenerPorId(input.id);
  if (!actual) throw new Error("Ese pago no existe.");

  const cambios: Partial<Omit<Pago, "id">> = { metadata };
  let fechaFinal = actual.fecha;

  if (input.fecha) {
    const f = new Date(input.fecha);
    if (isNaN(f.getTime())) throw new Error("La fecha del pago no es válida.");
    cambios.fecha = f;
    fechaFinal = f;
  }
  if (input.valor !== undefined) {
    if (input.valor <= 0) throw new Error("Ingresa el valor pagado.");
    cambios.valor = input.valor;
  }
if (input.periodoCubierto) {
  const clave = claveDePeriodo(input.periodoCubierto, fechaFinal);
  if (!clave) throw new Error("Elige el mes que cubre este pago.");

  const otros = await pagosRepo.listarPorAfiliado(actual.afiliadoId);
  const yaExiste = otros.some((p) => p.id !== actual.id && claveDePeriodo(p.periodoCubierto, p.fecha) === clave);
  if (yaExiste) {
    throw new Error(`Ya existe otro pago que cubre ese mes.`);
  }
  cambios.periodoCubierto = clave;
}
  if (input.comprobanteURL !== undefined) cambios.comprobanteURL = input.comprobanteURL;
  if (input.numeroRecibo !== undefined) cambios.numeroRecibo = (input.numeroRecibo ?? "").trim() || undefined;
  const actualizado = await pagosRepo.actualizar(input.id, cambios);
  await recalcularAfiliadoDesdePagos(afiliadosRepo, pagosRepo, actual.afiliadoId, metadata);
  return actualizado;
}