import { Servicio, ItemServicio } from "../../domain/entities/servicio";
import { MetadataCambio } from "../../domain/value-objects/metadata-cambio";
import { vincularBovedaAServicio } from "../boveda/vincularBovedaServicio.usecase";
import { BovedaRepository } from "../ports/boveda.repository";
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
  bovedaRepo: BovedaRepository, // ← nuevo parámetro
  input: RegistrarServicioInput,
  metadata: MetadataCambio
): Promise<Servicio> {
  const valorTotal = input.itemsServicio.reduce((suma, item) => suma + item.valorTotal, 0);

  const servicio = await repo.crear({
    fechaServicio: new Date(input.fechaServicio),
    sede: input.sede,
    convenioId: input.convenioId,
    afiliadoId: input.afiliadoId,
    fallecido: input.fallecido,
    tipoServicio: input.tipoServicio,
    tipoTraslado: input.tipoTraslado,
    usoBoveda: { usada: input.usaBoveda },
    tuvoMisaOCulto: input.tuvoMisaOCulto,
    itemsServicio: input.itemsServicio,
    valorTotal,
    estadoFacturacion: "pendiente por facturar",
    documentosAdjuntos: [],
    observaciones: input.observaciones,
    metadata,
  });

  if (input.usaBoveda) {
    await vincularBovedaAServicio(bovedaRepo, servicio.id, servicio.sede, servicio.fechaServicio, metadata);
  }

  return servicio;
}