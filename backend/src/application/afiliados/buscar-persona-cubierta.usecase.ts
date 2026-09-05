import { PersonaCubierta } from "../../domain/entities/afiliado";
import { AfiliadosRepository } from "../ports/afiliados.repository";

/**
 * Responde "¿esta persona tiene plan con nosotros?" — busca tanto por titular
 * como por beneficiario, usando nombre o número de cédula.
 * Usado por el dashboard, y en el futuro por el bot de WhatsApp / agente de voz.
 */
export async function buscarPersonaCubierta(
  repo: AfiliadosRepository,
  terminoBusqueda: string
): Promise<PersonaCubierta[]> {
  const termino = terminoBusqueda.trim();
  if (!termino) return [];
  return repo.buscarPersonaCubiertaPorNombreOCedula(termino);
}
