import { Flor } from "../../domain/entities/flor";
export interface FloresRepository {
  crear(flor: Omit<Flor, "id">): Promise<Flor>;
  listar(): Promise<Flor[]>;
  actualizar(id: string, cambios: Partial<Omit<Flor, "id">>): Promise<Flor>;
  eliminar(id: string): Promise<void>;
}