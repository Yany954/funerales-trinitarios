import { Pago } from "../../domain/entities/pago";

export interface PagosRepository {
  crear(pago: Omit<Pago, "id">): Promise<Pago>;
  listarPorAfiliado(afiliadoId: string): Promise<Pago[]>;
}