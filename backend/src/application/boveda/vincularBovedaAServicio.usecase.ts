import { BovedaRepository } from "../ports/boveda.repository";
import { MetadataCambio } from "../../domain/value-objects/metadata-cambio";
import { Sede } from "../../domain/value-objects/rol-usuario";

export async function vincularBovedaAServicio(
  repo: BovedaRepository,
  servicioId: string,
  sede: Sede,
  fechaServicio: Date,
  valorArriendo: number,
  metadata: MetadataCambio
): Promise<void> {
  const existente = await repo.obtenerPorServicioId(servicioId);
  if (existente) return;

  const fechaLimite = new Date(fechaServicio);
  fechaLimite.setFullYear(fechaLimite.getFullYear() + 4);

  await repo.crear({
    sede,
    servicioId,
    zona: sede,
    fechaInicio: fechaServicio,
    fechaLimite,
    valorArriendo,
    incluyeExhumacion: false,
    estado: "vigente",
    metadata,
  });
}

export async function desvincularBovedaDeServicio(repo: BovedaRepository, servicioId: string): Promise<void> {
  const existente = await repo.obtenerPorServicioId(servicioId);
  if (existente) await repo.eliminar(existente.id);
}