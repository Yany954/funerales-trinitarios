import { TipoCofre } from "../../domain/entities/cofre";

export interface CofresRepository {
  crear(cofre: Omit<TipoCofre, "id">): Promise<TipoCofre>;
  listar(): Promise<TipoCofre[]>;
}