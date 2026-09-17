import { AfiliadosRepository } from "../ports/afiliados.repository";

export async function eliminarAfiliado(repo: AfiliadosRepository, id: string): Promise<void> {
  await repo.eliminar(id);
}