import { Pago } from "../../domain/entities/pago";
import { MetadataCambio } from "../../domain/value-objects/metadata-cambio";
import { PagosRepository } from "../ports/pagos.repository";
import { AfiliadosRepository } from "../ports/afiliados.repository";

export interface RegistrarPagoInput {
  afiliadoId: string;
  sede: string;
  fecha: string; // "yyyy-mm-dd"
  valor: number;
  periodoCubierto: string;
  comprobanteURL: string;
}

export async function registrarPago(
  pagosRepo: PagosRepository,
  afiliadosRepo: AfiliadosRepository,
  input: RegistrarPagoInput,
  metadata: MetadataCambio
): Promise<Pago> {
  const fecha = new Date(input.fecha);

  const pago = await pagosRepo.crear({
    afiliadoId: input.afiliadoId,
    sede: input.sede,
    fecha,
    valor: input.valor,
    periodoCubierto: input.periodoCubierto,
    comprobanteURL: input.comprobanteURL,
    metadata,
  });

  // Registrar el pago también actualiza al afiliado: guarda el último pago
  // y lo saca de mora, si estaba — así el estado se ve al instante en la tabla.
  await afiliadosRepo.actualizarUltimoPago(
    input.afiliadoId,
    { fecha, valor: input.valor, metodo: "comprobante" },
    metadata
  );

  return pago;
}