export function claveBeneficiario(b: { cedula?: string; nombre: string }): string {
  const cedula = (b.cedula ?? "").replace(/\s+/g, "");
  return cedula || `nombre:${b.nombre.trim().toLowerCase()}`;
}