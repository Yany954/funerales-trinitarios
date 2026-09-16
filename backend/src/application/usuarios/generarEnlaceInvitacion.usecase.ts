import { UsuariosRepository } from "../ports/usuarios.repository";

export async function generarEnlaceInvitacion(repo: UsuariosRepository, email: string): Promise<string> {
  return repo.generarEnlaceInvitacion(email);
}