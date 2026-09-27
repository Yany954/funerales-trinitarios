import { Servicio, ItemServicio } from "../../domain/entities/servicio";
import { MetadataCambio } from "../../domain/value-objects/metadata-cambio";
import { ServiciosRepository } from "../ports/servicios.repository";
import { BovedaRepository } from "../ports/boveda.repository";
import { vincularBovedaAServicio } from "../boveda/vincularBovedaAServicio.usecase";

export interface RegistrarServicioInput {
  fechaServicio: string;
  sede: Servicio["sede"];
  convenioId: string;
  afiliadoId?: string;
  esAfiliado: boolean;
  cedulaTitular?: string;
  fallecido: { nombreCompleto: string; cedula?: string };
  tipoServicio: Servicio["tipoServicio"];
  tipoTraslado: Servicio["tipoTraslado"];
  usaBoveda: boolean;
  valorBoveda?: number; // requerido si usaBoveda = true
  tuvoMisaOCulto: Servicio["tuvoMisaOCulto"];
  itemsServicio: ItemServicio[];
  observaciones?: string;
}

export async function registrarServicio(
  repo: ServiciosRepository,
  bovedaRepo: BovedaRepository,
  input: RegistrarServicioInput,
  metadata: MetadataCambio
): Promise<Servicio> {
  if (!input.sede) throw new Error("La sede es obligatoria.");
  if (!input.fallecido.cedula) throw new Error("La cédula del fallecido es obligatoria.");
  if (input.esAfiliado && !input.cedulaTitular) throw new Error("La cédula del titular del plan es obligatoria cuando el servicio es de un afiliado.");
  if (input.usaBoveda && !input.valorBoveda) throw new Error("Ingresa el precio de la bóveda.");

  // Si usa bóveda, se agrega automáticamente como un ítem más de la factura.
  const items = input.usaBoveda
    ? [...input.itemsServicio, { concepto: "Bóveda", cantidad: 1, valorUnitario: input.valorBoveda!, valorTotal: input.valorBoveda! }]
    : input.itemsServicio;
  const valorTotal = items.reduce((suma, item) => suma + item.valorTotal, 0);

  const servicio = await repo.crear({
    fechaServicio: new Date(input.fechaServicio),
    sede: input.sede,
    convenioId: input.convenioId,
    afiliadoId: input.afiliadoId,
    esAfiliado: input.esAfiliado,
    cedulaTitular: input.esAfiliado ? input.cedulaTitular : undefined,
    fallecido: input.fallecido,
    tipoServicio: input.tipoServicio,
    tipoTraslado: input.tipoTraslado,
    usoBoveda: { usada: input.usaBoveda },
    tuvoMisaOCulto: input.tuvoMisaOCulto,
    itemsServicio: items,
    valorTotal,
    estadoFacturacion: "pendiente por facturar",
    documentosAdjuntos: [],
    observaciones: input.observaciones,
    metadata,
  });

  if (input.usaBoveda) {
    await vincularBovedaAServicio(bovedaRepo, servicio.id, servicio.sede, servicio.fechaServicio, input.valorBoveda!, metadata);
  }

  return servicio;
}