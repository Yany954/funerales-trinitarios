import { ServiciosRepository } from "../ports/servicios.repository";
import { BovedaRepository } from "../ports/boveda.repository";
import { desvincularBovedaDeServicio } from "../boveda/vincularBovedaServicio.usecase";

export async function eliminarServicio(
  serviciosRepo: ServiciosRepository,
  bovedaRepo: BovedaRepository,
  id: string
): Promise<void> {
  await desvincularBovedaDeServicio(bovedaRepo, id);
  await serviciosRepo.eliminar(id);
}