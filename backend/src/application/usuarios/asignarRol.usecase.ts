import { getAuth } from "firebase-admin/auth";
import { ClaimsUsuario } from "../../domain/value-objects/rol-usuario";

export async function asignarRol(uidObjetivo: string, claims: ClaimsUsuario): Promise<void> {
  await getAuth().setCustomUserClaims(uidObjetivo, claims);
}