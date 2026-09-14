import { Flor } from "../../domain/entities/flor";
export interface FloresRepository {
  crear(flor: Omit<Flor, "id">): Promise<Flor>;
  listar(): Promise<Flor[]>;
}