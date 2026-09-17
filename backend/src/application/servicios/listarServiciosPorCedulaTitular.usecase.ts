import { Servicio } from "../../domain/entities/servicio";
import { ServiciosRepository } from "../ports/servicios.repository";

export async function listarServiciosPorCedulaTitular(repo: ServiciosRepository, cedula: string): Promise<Servicio[]> {
  return repo.buscarPorCedulaTitular(cedula);
}