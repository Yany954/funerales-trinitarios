import { Servicio, ItemServicio } from "../../domain/entities/servicio";
import { MetadataCambio } from "../../domain/value-objects/metadata-cambio";
import { BovedaRepository } from "../ports/boveda.repository";
import { ServiciosRepository } from "../ports/servicios.repository";
import { vincularBovedaAServicio, desvincularBovedaDeServicio } from "../boveda/vincularBovedaServicio.usecase";

export interface ActualizarServicioInput {
  id: string;
  fechaServicio?: string;
  convenioId?: string;
  fallecido?: { nombreCompleto: string; cedula?: string };
  tipoServicio?: Servicio["tipoServicio"];
  tipoTraslado?: Servicio["tipoTraslado"];
  usaBoveda?: boolean;
  tuvoMisaOCulto?: Servicio["tuvoMisaOCulto"];
  itemsServicio?: ItemServicio[];
  documentosAdjuntos?: string[];
  observaciones?: string;
}

export async function actualizarServicio(
  repo: ServiciosRepository,
  bovedaRepo: BovedaRepository,
  input: ActualizarServicioInput,
  metadata: MetadataCambio
): Promise<Servicio> {
  const actual = await repo.obtenerPorId(input.id);
  if (!actual) throw new Error("Ese servicio no existe.");

  const cambios: Partial<Omit<Servicio, "id">> = { metadata };
  if (input.fechaServicio) cambios.fechaServicio = new Date(input.fechaServicio);
  if (input.convenioId) cambios.convenioId = input.convenioId;
  if (input.fallecido) cambios.fallecido = input.fallecido;
  if (input.tipoServicio) cambios.tipoServicio = input.tipoServicio;
  if (input.tipoTraslado) cambios.tipoTraslado = input.tipoTraslado;
  if (input.usaBoveda !== undefined) cambios.usoBoveda = { ...actual.usoBoveda, usada: input.usaBoveda };
  if (input.tuvoMisaOCulto) cambios.tuvoMisaOCulto = input.tuvoMisaOCulto;
  if (input.itemsServicio) {
    cambios.itemsServicio = input.itemsServicio;
    cambios.valorTotal = input.itemsServicio.reduce((s, it) => s + it.valorTotal, 0);
  }
  if (input.documentosAdjuntos) cambios.documentosAdjuntos = input.documentosAdjuntos;
  if (input.observaciones !== undefined) cambios.observaciones = input.observaciones;

  const actualizado = await repo.actualizar(input.id, cambios);

  // Si cambió si usa bóveda o no, la bóveda vinculada se crea/borra sola.
  if (input.usaBoveda !== undefined && input.usaBoveda !== actual.usoBoveda.usada) {
    if (input.usaBoveda) {
      await vincularBovedaAServicio(bovedaRepo, actualizado.id, actualizado.sede, actualizado.fechaServicio, metadata);
    } else {
      await desvincularBovedaDeServicio(bovedaRepo, actualizado.id);
    }
  }

  return actualizado;
}