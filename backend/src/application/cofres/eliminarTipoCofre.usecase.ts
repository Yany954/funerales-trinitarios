import { CofresRepository } from "../ports/cofres.repository";

export async function eliminarTipoCofre(repo: CofresRepository, id: string): Promise<void> {
  await repo.eliminar(id);
}