import { normalizarCedula } from "./cedula";

export function claveBeneficiario(b: { cedula?: string; nombre: string }): string {
  const cedula = normalizarCedula(b.cedula);
  return cedula || `nombre:${b.nombre.trim().toLowerCase()}`;
}
