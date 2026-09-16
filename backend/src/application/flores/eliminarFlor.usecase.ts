import { FloresRepository } from "../ports/flores.repository";

export async function eliminarFlor(repo: FloresRepository, id: string): Promise<void> {
  await repo.eliminar(id);
}