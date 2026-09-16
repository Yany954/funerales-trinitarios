import { TipoCofre } from "../../domain/entities/cofre";

export interface CofresRepository {
  crear(cofre: Omit<TipoCofre, "id">): Promise<TipoCofre>;
  listar(): Promise<TipoCofre[]>;
  eliminar(id: string): Promise<void>;
  actualizar(id: string, cambios: Partial<Omit<TipoCofre, "id">>): Promise<TipoCofre>;
}