import { Pago } from "../../domain/entities/pago";
import { PagosRepository } from "../ports/pagos.repository";

export async function listarPagosPorAfiliado(repo: PagosRepository, afiliadoId: string): Promise<Pago[]> {
  return repo.listarPorAfiliado(afiliadoId);
}