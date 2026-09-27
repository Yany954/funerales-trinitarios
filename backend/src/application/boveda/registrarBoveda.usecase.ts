import { Boveda } from "../../domain/entities/boveda";
import { MetadataCambio } from "../../domain/value-objects/metadata-cambio";
import { Sede } from "../../domain/value-objects/rol-usuario";
import { BovedaRepository } from "../ports/boveda.repository";
import { ItemBovedaRepository } from "../ports/item-boveda.repository";

export interface RegistrarBovedaInput {
  sede: Sede;
  servicioId?: string;
  zona: string; // ahora viene del dropdown de veredas, texto libre por si acaso
  itemBovedaId?: string; // si se eligió un ítem del catálogo
  valorArriendo?: number; // override manual — si viene, gana sobre el precio del catálogo
  fechaInicio: string;
  incluyeExhumacion: boolean;
}

export async function registrarBoveda(
  repo: BovedaRepository,
  itemBovedaRepo: ItemBovedaRepository,
  input: RegistrarBovedaInput,
  metadata: MetadataCambio
): Promise<Boveda> {
  let valorArriendo = input.valorArriendo;

  // Si no hay override manual, el precio SIEMPRE sale del catálogo — nunca
  // de un valor "por defecto" quemado en el código.
  if (valorArriendo === undefined) {
    if (!input.itemBovedaId) {
      throw new Error("Elige un ítem del catálogo de bóvedas, o ingresa un valor manual.");
    }
    const item = await itemBovedaRepo.obtenerPorId(input.itemBovedaId);
    if (!item) throw new Error("Ese ítem de bóveda ya no existe en el catálogo.");
    valorArriendo = item.precio;
  }

  const fechaInicio = new Date(input.fechaInicio);
  const fechaLimite = new Date(fechaInicio);
  fechaLimite.setFullYear(fechaLimite.getFullYear() + 4);

  return repo.crear({
    sede: input.sede,
    servicioId: input.servicioId,
    zona: input.zona?.trim() || "Pailitas", // si queda vacío, asume Pailitas — tal como pediste
    itemBovedaId: input.itemBovedaId,
    fechaInicio,
    fechaLimite,
    valorArriendo,
    incluyeExhumacion: input.incluyeExhumacion,
    estado: "vigente",
    metadata,
  });
}