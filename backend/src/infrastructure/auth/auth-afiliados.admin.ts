import { getAuth } from "firebase-admin/auth";
import "../firebase/admin"; // asegura initializeApp()
import { AuthAfiliadosService } from "../../application/ports/cuentas-afiliado.repository";
import { ClaimsAfiliado } from "../../domain/value-objects/rol-usuario";

function esNoEncontrado(err: unknown): boolean {
  return (err as { code?: string })?.code === "auth/user-not-found";
}

/** Cuentas de Firebase Auth de los afiliados, con el Admin SDK. */
export class AuthAfiliadosAdmin implements AuthAfiliadosService {
  async buscarPorCorreo(correo: string) {
    try {
      const u = await getAuth().getUserByEmail(correo);
      return { uid: u.uid, claims: u.customClaims ?? {} };
    } catch (err) {
      if (esNoEncontrado(err)) return null;
      throw err;
    }
  }

  async crear(correo: string, pin: string, nombre: string, claims: ClaimsAfiliado): Promise<string> {
    // El PIN es la contraseña: Firebase Auth la guarda cifrada, nadie la puede leer.
    const u = await getAuth().createUser({ email: correo, password: pin, displayName: nombre, emailVerified: false });
    await getAuth().setCustomUserClaims(u.uid, claims);
    return u.uid;
  }

  async eliminar(uid: string): Promise<void> {
    try {
      await getAuth().deleteUser(uid);
    } catch (err) {
      if (!esNoEncontrado(err)) throw err;
    }
  }
}
