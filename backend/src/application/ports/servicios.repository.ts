import { Servicio } from "../../domain/entities/servicio";

export interface ServiciosRepository {
  crear(servicio: Omit<Servicio, "id">): Promise<Servicio>;
  listarPorSede(sede: string): Promise<Servicio[]>;
}