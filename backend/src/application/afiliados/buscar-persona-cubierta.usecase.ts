import { PersonaCubierta, Afiliado } from "../../domain/entities/afiliado";
import { AfiliadosRepository } from "../ports/afiliados.repository";

export interface ResultadoBusqueda {
  persona: PersonaCubierta;
  afiliado: Afiliado;
}

export async function buscarPersonaCubierta(
  repo: AfiliadosRepository,
  terminoBusqueda: string
): Promise<ResultadoBusqueda[]> {
  const termino = terminoBusqueda.trim();
  if (!termino) return [];

  const personas = await repo.buscarPersonaCubiertaPorNombreOCedula(termino);

  // Un mismo afiliado puede aparecer más de una vez en los resultados
  // (titular + varios beneficiarios) — evita pedir su ficha completa
  // repetida.
  const idsUnicos = Array.from(new Set(personas.map((p) => p.afiliadoId)));
  const afiliados = await Promise.all(idsUnicos.map((id) => repo.obtenerPorId(id)));
  const mapaAfiliados = new Map(
    afiliados.filter((a): a is Afiliado => a !== null).map((a) => [a.id, a])
  );

  return personas
    .map((persona) => {
      const afiliado = mapaAfiliados.get(persona.afiliadoId);
      return afiliado ? { persona, afiliado } : null;
    })
    .filter((r): r is ResultadoBusqueda => r !== null);
}