/**
 * Convierte "aaaa-mm-dd" a Date y valida que el año sea razonable — evita fechas
 * como 14/10/0202 cuando se escribe el año incompleto en el calendario.
 */
export function parsearFechaValida(valor: string, campo: string): Date {
  const fecha = new Date(valor);
  if (isNaN(fecha.getTime())) throw new Error(`La ${campo} no es válida.`);
  const anio = fecha.getUTCFullYear();
  if (anio < 1900 || anio > 2100) {
    throw new Error(`La ${campo} tiene el año ${anio}, revisa que esté completo (ej. 2026).`);
  }
  return fecha;
}
