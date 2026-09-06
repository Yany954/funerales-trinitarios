import { Boveda, EstadoBoveda } from "../../domain/entities/boveda";
import { MetadataCambio } from "../../domain/value-objects/metadata-cambio";

export interface BovedaRepository {
  crear(
    servicioId: string,
    zona: string,
    fechaInicio: Date,
    valorArriendo: number,
    incluyeExhumacion: boolean,
    metadata: MetadataCambio
  ): Promise<Boveda>;
  listarEstado(estado: EstadoBoveda): Promise<Boveda[]>;
  actualizar(boveda: Boveda): Promise<void>;
  eliminar(id: string): Promise<void>;
  actualizarEstado(
    bovedaId: string,
    nuevoEstado: EstadoBoveda,
    metadata: MetadataCambio
  ): Promise<void>;
}