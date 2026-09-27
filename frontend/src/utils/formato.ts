export function formatoPesos(valor: number | undefined | null): string {
  return `$${(valor ?? 0).toLocaleString("es-CO")}`;
}
export function formatoTamano(cm: number | undefined | null): string {
  if (cm === undefined || cm === null) return "—";
  if (cm < 100) return `${cm} cm`;
  const metros = cm / 100;
  return `${metros % 1 === 0 ? metros.toFixed(0) : metros.toFixed(2)} m`;
}
export function formatoFecha(valor: unknown): string {
  if (!valor) return "Fecha no disponible";
  const fecha = (valor as { toDate?: () => Date }).toDate
    ? (valor as { toDate: () => Date }).toDate()
    : new Date(valor as string | number | Date);
  if (isNaN(fecha.getTime())) return "Fecha no disponible";
  return fecha.toLocaleDateString("es-CO");
}