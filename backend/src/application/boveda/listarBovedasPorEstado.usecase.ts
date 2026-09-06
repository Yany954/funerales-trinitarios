import { Boveda, EstadoBoveda } from "../../domain/entities/boveda";
import { BovedaRepository } from "../ports/boveda.repository";


export async function listarBovedasPorEstado(
  bovedaRepository: BovedaRepository,
  estado: EstadoBoveda
): Promise<Boveda[]> {
  return bovedaRepository.listarEstado(estado);
}