/**
 * Convierte cualquier forma en que alguien escriba un precio en pesos
 * colombianos (sin decimales) a un número entero limpio. Como el peso
 * colombiano nunca usa decimales, cualquier símbolo que no sea un dígito
 * se puede quitar sin perder información — no importa si la persona usó
 * punto, coma o apóstrofe como separador de miles.
 * Ej: "1.366.300" -> 1366300 · "1,366,300" -> 1366300 · "1'366.300" -> 1366300
 */
export function parsearPesosCOP(texto: string): number {
  const soloDigitos = texto.replace(/[^0-9]/g, "");
  return soloDigitos ? parseInt(soloDigitos, 10) : 0;
}

export function formatearPesosCOP(valor: number): string {
  return valor.toLocaleString("es-CO");
}