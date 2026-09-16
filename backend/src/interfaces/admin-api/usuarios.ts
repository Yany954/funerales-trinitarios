import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireAuth } from "../../infrastructure/auth/rbac";
import { UsuariosRepositoryAdmin } from "../../infrastructure/firebase/usuarios.repository.admin";
import { crearUsuario, CrearUsuarioInput } from "../../application/usuarios/crearUsuario.usecase";
import { listarUsuarios } from "../../application/usuarios/listarUsuarios.usecase";
import { generarEnlaceInvitacion } from "../../application/usuarios/generarEnlaceInvitacion.usecase";
import { cambiarEstadoUsuario } from "../../application/usuarios/cambiarEstadoUsuario.usecase";
import { ClaimsUsuario } from "../../domain/value-objects/rol-usuario";

const repo = new UsuariosRepositoryAdmin();

function exigirAdmin(request: any) {
  if (request.auth?.token.rol !== "admin") {
    throw new HttpsError("permission-denied", "Solo un administrador puede gestionar usuarios.");
  }
}

export const crearUsuarioFn = onCall<CrearUsuarioInput>(async (request) => {
  requireAuth(request);
  exigirAdmin(request);
  return crearUsuario(repo, request.data);
});

export const listarUsuariosFn = onCall(async (request) => {
  requireAuth(request);
  exigirAdmin(request);
  const usuarios = await listarUsuarios(repo);
  return { usuarios };
});

export const asignarRolFn = onCall<{ uid: string; claims: ClaimsUsuario }>(async (request) => {
  requireAuth(request);
  exigirAdmin(request);
  await repo.asignarClaims(request.data.uid, request.data.claims);
  return { ok: true };
});

export const generarEnlaceInvitacionFn = onCall<{ email: string }>(async (request) => {
  requireAuth(request);
  exigirAdmin(request);
  const enlaceInvitacion = await generarEnlaceInvitacion(repo, request.data.email);
  return { enlaceInvitacion };
});

export const cambiarEstadoUsuarioFn = onCall<{ uid: string; deshabilitado: boolean }>(async (request) => {
  requireAuth(request);
  exigirAdmin(request);
  await cambiarEstadoUsuario(repo, request.data.uid, request.data.deshabilitado);
  return { ok: true };
});