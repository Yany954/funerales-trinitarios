import { UsuariosRepository, UsuarioListado } from "../ports/usuarios.repository";

export async function listarUsuarios(repo: UsuariosRepository): Promise<UsuarioListado[]> {
  return repo.listar();
}