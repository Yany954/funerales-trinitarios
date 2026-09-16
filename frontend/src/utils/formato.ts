export function formatoPesos(valor: number | undefined | null): string {
  return `$${(valor ?? 0).toLocaleString("es-CO")}`;
}
export function formatoTamano(cm: number | undefined | null): string {
  if (cm === undefined || cm === null) return "—";
  if (cm < 100) return `${cm} cm`;
  const metros = cm / 100;
  return `${metros % 1 === 0 ? metros.toFixed(0) : metros.toFixed(2)} m`;
}