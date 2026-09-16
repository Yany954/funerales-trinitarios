import { Servicio } from "../../domain/entities/servicio";

export interface ServiciosRepository {
  crear(servicio: Omit<Servicio, "id">): Promise<Servicio>;
  listarPorSede(sede: string): Promise<Servicio[]>;
  buscarPorConvenio(convenioId: string, desde: Date, hasta: Date): Promise<Servicio[]>;
  buscarPorSede(sede: string, desde: Date, hasta: Date): Promise<Servicio[]>;
  obtenerPorId(id: string): Promise<Servicio | null>;
actualizar(id: string, cambios: Partial<Omit<Servicio, "id">>): Promise<Servicio>;
}