import { getAuth } from "firebase-admin/auth";
import { ClaimsUsuario, ROL_AFILIADO } from "../../domain/value-objects/rol-usuario";
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
    // Se recorren todas las páginas: con la app, las cuentas de afiliados
    // pueden ser miles, y el staff no debe quedar fuera de la primera página.
    const usuarios: UsuarioListado[] = [];
    let pagina: string | undefined;
    do {
      const resultado = await getAuth().listUsers(1000, pagina);
      for (const u of resultado.users) {
        // Las cuentas de la app de afiliados no son usuarios del dashboard.
        if (u.customClaims?.rol === ROL_AFILIADO) continue;
        usuarios.push({
          uid: u.uid,
          email: u.email ?? "",
          nombre: u.displayName ?? "(sin nombre)",
          rol: (u.customClaims?.rol as string) ?? "empleado",
          sede: (u.customClaims?.sede as string) ?? "—",
          deshabilitado: u.disabled,
        });
      }
      pagina = resultado.pageToken;
    } while (pagina);
    return usuarios;
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