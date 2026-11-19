/**
 * Celular colombiano: 10 dígitos que empiezan por 3. Acepta "+57", espacios,
 * guiones y paréntesis ("+57 300 123 4567" → "3001234567"). Devuelve null si no sirve.
 */
export function normalizarCelular(valor: string | undefined | null): string | null {
  let digitos = (valor ?? "").replace(/\D/g, "");
  if (digitos.length === 12 && digitos.startsWith("57")) digitos = digitos.slice(2);
  return /^3\d{9}$/.test(digitos) ? digitos : null;
}
