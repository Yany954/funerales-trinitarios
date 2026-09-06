import { BovedaRepository } from "../ports/boveda.repository";
import { MetadataCambio } from "../../domain/value-objects/metadata-cambio";

export async function actualizarEstadosVencimiento(
  repo: BovedaRepository,
  systemMetadata: MetadataCambio
): Promise<void> {
  const ahora = new Date();

  // 1. Process active vaults to check if they need to be marked as "por vencer" or "vencida"
  const bovedasVigentes = await repo.listarEstado("vigente");

  for (const boveda of bovedasVigentes) {
    const msDiferencia = boveda.fechaLimite.getTime() - ahora.getTime();
    const diasRestantes = msDiferencia / (1000 * 60 * 60 * 24);

    if (diasRestantes <= 0) {
      await repo.actualizarEstado(boveda.id, "vencida", systemMetadata);
    } else if (diasRestantes <= 30) {
      await repo.actualizarEstado(boveda.id, "por vencer", systemMetadata);
    }
  }

  // 2. Process "por vencer" vaults to check if they have now passed their expiration date
  const bovedasPorVencer = await repo.listarEstado("por vencer");

  for (const boveda of bovedasPorVencer) {
    if (boveda.fechaLimite.getTime() <= ahora.getTime()) {
      await repo.actualizarEstado(boveda.id, "vencida", systemMetadata);
    }
  }
}