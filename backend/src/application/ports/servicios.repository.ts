import { Servicio } from "../../domain/entities/servicio";

export interface ServiciosRepository {
  crear(servicio: Omit<Servicio, "id">): Promise<Servicio>;
  listarPorSede(sede: string): Promise<Servicio[]>;
  buscarPorConvenio(convenioId: string, desde: Date, hasta: Date): Promise<Servicio[]>;
  buscarPorSedeYConvenios(sede: string, convenioIds: string[], desde: Date, hasta: Date): Promise<Servicio[]>;
}