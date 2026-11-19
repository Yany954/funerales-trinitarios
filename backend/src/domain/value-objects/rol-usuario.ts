/** Roles del staff (dashboard). */
export type Rol = "admin" | "empleado";
export type Sede = "Pailitas" | "Tamalameque" | "Pelaya" | "Curumaní";
export type SedeOTodas = Sede | "all";

export interface ClaimsUsuario {
  rol: Rol;
  sede: SedeOTodas;
}

/**
 * Titular que usa la app móvil (con plan exequial, solo seguro de vida, o ambos).
 * Es un rol aparte del staff: nunca entra al dashboard ni a admin-api.
 * El rol dice QUÉ PUEDE HACER (ver solo sus datos), no qué producto tiene:
 * el producto se lee del documento del afiliado (soloSeguro / tieneSeguroVida).
 */
export const ROL_AFILIADO = "afiliado" as const;

export interface ClaimsAfiliado {
  rol: typeof ROL_AFILIADO;
  afiliadoId: string;
}
