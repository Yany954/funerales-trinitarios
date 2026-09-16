import { ClaimsUsuario } from "../../domain/value-objects/rol-usuario";
import { UsuariosRepository } from "../ports/usuarios.repository";

export interface CrearUsuarioInput {
  nombre: string;
  email: string;
  rol: ClaimsUsuario["rol"];
  sede: ClaimsUsuario["sede"];
}

export async function crearUsuario(
  repo: UsuariosRepository,
  input: CrearUsuarioInput
): Promise<{ uid: string; enlaceInvitacion: string }> {
  const claims: ClaimsUsuario = { rol: input.rol, sede: input.rol === "admin" ? "all" : input.sede };
  const { uid } = await repo.crear(input.email, input.nombre, claims);
  const enlaceInvitacion = await repo.generarEnlaceInvitacion(input.email);
  return { uid, enlaceInvitacion };
}