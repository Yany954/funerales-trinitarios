import { Pago } from "../../domain/entities/pago";

export interface PagosRepository {
  crear(pago: Omit<Pago, "id">): Promise<Pago>;
  obtenerPorId(id: string): Promise<Pago | null>;
  listarPorAfiliado(afiliadoId: string): Promise<Pago[]>;
  listarTodos(): Promise<Pago[]>;
  actualizar(id: string, cambios: Partial<Omit<Pago, "id">>): Promise<Pago>;
  eliminar(id: string): Promise<void>;
}