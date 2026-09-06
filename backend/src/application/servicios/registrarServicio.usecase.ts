import { Servicio, ItemServicio } from "../../domain/entities/servicio";
import { MetadataCambio } from "../../domain/value-objects/metadata-cambio";
import { ServiciosRepository } from "../ports/servicios.repository";

export interface RegistrarServicioInput {
  fechaServicio: string;
  sede: Servicio["sede"];
  convenioId: string;
  afiliadoId?: string;
  fallecido: { nombreCompleto: string; cedula?: string };
  tipoServicio: Servicio["tipoServicio"];
  tipoTraslado: Servicio["tipoTraslado"];
  usaBoveda: boolean;
  tuvoMisaOCulto: Servicio["tuvoMisaOCulto"];
  itemsServicio: ItemServicio[];
  observaciones?: string;
}

export async function registrarServicio(
  repo: ServiciosRepository,
  input: RegistrarServicioInput,
  metadata: MetadataCambio
): Promise<Servicio> {
  const valorTotal = input.itemsServicio.reduce((suma, item) => suma + item.valorTotal, 0);

  return repo.crear({
    fechaServicio: new Date(input.fechaServicio),
    sede: input.sede,
    convenioId: input.convenioId,
    afiliadoId: input.afiliadoId,
    fallecido: input.fallecido,
    tipoServicio: input.tipoServicio,
    tipoTraslado: input.tipoTraslado,
    usoBoveda: { usada: input.usaBoveda }, // la bóveda de verdad (zona, fechas) se crea en el módulo de Bóvedas, referenciando este servicio
    tuvoMisaOCulto: input.tuvoMisaOCulto,
    itemsServicio: input.itemsServicio,
    valorTotal,
    estadoFacturacion: "pendiente por facturar",
    documentosAdjuntos: [],
    observaciones: input.observaciones,
    metadata,
  });
}