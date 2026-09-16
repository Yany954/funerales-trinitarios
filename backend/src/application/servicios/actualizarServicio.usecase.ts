import { Servicio, ItemServicio } from "../../domain/entities/servicio";
import { MetadataCambio } from "../../domain/value-objects/metadata-cambio";
import { ServiciosRepository } from "../ports/servicios.repository";

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
  // OJO: estadoFacturacion nunca se toca aquí a propósito — solo el módulo
  // de Pagos (que viene después) puede marcar un servicio como facturado/pagado.

  return repo.actualizar(input.id, cambios);
}