import { ClaimsUsuario } from "../../domain/value-objects/rol-usuario";

export interface UsuarioListado {
  uid: string;
  email: string;
  nombre: string;
  rol: string;
  sede: string;
  deshabilitado: boolean;
}

export interface UsuariosRepository {
  crear(email: string, nombre: string, claims: ClaimsUsuario): Promise<{ uid: string }>;
  listar(): Promise<UsuarioListado[]>;
  asignarClaims(uid: string, claims: ClaimsUsuario): Promise<void>;
  generarEnlaceInvitacion(email: string): Promise<string>;
  cambiarEstado(uid: string, deshabilitado: boolean): Promise<void>;
}