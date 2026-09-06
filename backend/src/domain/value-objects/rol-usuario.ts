export type Rol = "admin" | "empleado";
export type Sede = "Pailitas" | "Tamalameque" | "Pelaya" | "Curumaní";
export type SedeOTodas = Sede | "all";

export interface ClaimsUsuario {
  rol: Rol;
  sede: SedeOTodas;
}