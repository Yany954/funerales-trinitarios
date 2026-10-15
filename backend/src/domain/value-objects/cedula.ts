/** Deja solo letras y números: "1.234.567", "1 234 567" y "1234567" quedan iguales. */
export function normalizarCedula(cedula: string | undefined | null): string {
  return (cedula ?? "").replace(/[^0-9a-zA-Z]/g, "").toUpperCase();
}
