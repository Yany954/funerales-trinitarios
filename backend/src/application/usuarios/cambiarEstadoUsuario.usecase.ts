import { UsuariosRepository } from "../ports/usuarios.repository";

export async function cambiarEstadoUsuario(repo: UsuariosRepository, uid: string, deshabilitado: boolean): Promise<void> {
  await repo.cambiarEstado(uid, deshabilitado);
}