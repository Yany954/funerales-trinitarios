import { getAuth } from "firebase-admin/auth";
import { ClaimsUsuario } from "../../domain/value-objects/rol-usuario";
import { UsuariosRepository, UsuarioListado } from "../../application/ports/usuarios.repository";

export class UsuariosRepositoryAdmin implements UsuariosRepository {
  async crear(email: string, nombre: string, claims: ClaimsUsuario): Promise<{ uid: string }> {
    // Contraseña temporal aleatoria — nadie la va a usar, porque el enlace de
    // invitación obliga a la persona a poner la suya propia antes de entrar.
    const passwordTemporal = Math.random().toString(36).slice(-12) + "Aa1!";
    const usuario = await getAuth().createUser({ email, password: passwordTemporal, displayName: nombre });
    await getAuth().setCustomUserClaims(usuario.uid, claims);
    return { uid: usuario.uid };
  }

  async listar(): Promise<UsuarioListado[]> {
    const resultado = await getAuth().listUsers(1000);
    return resultado.users.map((u) => ({
      uid: u.uid,
      email: u.email ?? "",
      nombre: u.displayName ?? "(sin nombre)",
      rol: (u.customClaims?.rol as string) ?? "empleado",
      sede: (u.customClaims?.sede as string) ?? "—",
      deshabilitado: u.disabled,
    }));
  }

  async asignarClaims(uid: string, claims: ClaimsUsuario): Promise<void> {
    await getAuth().setCustomUserClaims(uid, claims);
  }

  async generarEnlaceInvitacion(email: string): Promise<string> {
    return getAuth().generatePasswordResetLink(email);
  }

  async cambiarEstado(uid: string, deshabilitado: boolean): Promise<void> {
    await getAuth().updateUser(uid, { disabled: deshabilitado });
  }
}