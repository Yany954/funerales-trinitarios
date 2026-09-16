import { BovedaRepository } from "../ports/boveda.repository";
import { MetadataCambio } from "../../domain/value-objects/metadata-cambio";
import { Sede } from "../../domain/value-objects/rol-usuario";

// Precios base por zona, tomados de tus notas reales de arriendo de bóveda.
// El staff puede ajustarlos después desde la página de Bóvedas si el caso es distinto.
function datosBovedaPorSede(sede: Sede): { zona: string; valorArriendo: number } {
  if (sede === "Curumaní") {
    return { zona: "Curumaní-Chiriguaná", valorArriendo: 1474800 };
  }
  return { zona: "Pailitas-Pelaya-Tamalameque", valorArriendo: 998450 };
}

export async function vincularBovedaAServicio(
  repo: BovedaRepository,
  servicioId: string,
  sede: Sede,
  fechaServicio: Date,
  metadata: MetadataCambio
): Promise<void> {
  const existente = await repo.obtenerPorServicioId(servicioId);
  if (existente) return; // ya está vinculada, no duplicar

  const { zona, valorArriendo } = datosBovedaPorSede(sede);
  const fechaInicio = fechaServicio;
  const fechaLimite = new Date(fechaInicio);
  fechaLimite.setFullYear(fechaLimite.getFullYear() + 4);

  await repo.crear({
    sede,
    servicioId,
    zona,
    fechaInicio,
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