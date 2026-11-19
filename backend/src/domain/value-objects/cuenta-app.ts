import { normalizarCedula } from "./cedula";

/**
 * Reglas puras de la cuenta de la app de afiliados (sin Firebase).
 *
 * Cómo funciona el login: Firebase Auth necesita un correo (o celular) por
 * cuenta, y los afiliados no tienen. Por eso cada titular recibe un correo
 * "interno" armado con su cédula — no existe de verdad y el afiliado nunca lo ve.
 * En la app escribe cédula + PIN, y la app los convierte en correo + contraseña.
 * El PIN se guarda solo en Firebase Auth (cifrado); nadie puede leerlo.
 */

/** Dominio ficticio de los correos internos. Debe ser idéntico en la app móvil. */
export const DOMINIO_CORREO_AFILIADO = "afiliados.trinitarios.app";

export const LARGO_PIN = 6;
export const LARGO_CODIGO_ACTIVACION = 6;
export const DIAS_VIGENCIA_CODIGO = 7;

/** Intentos fallidos de registro por cédula antes de bloquearla un rato. */
export const MAX_INTENTOS_FALLIDOS = 5;
export const MINUTOS_BLOQUEO = 30;

/** Sin 0/O, 1/I/L: así no se confunden al dictarlo por teléfono o WhatsApp. */
export const ALFABETO_CODIGO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function correoInternoAfiliado(cedula: string): string {
  return `${normalizarCedula(cedula).toLowerCase()}@${DOMINIO_CORREO_AFILIADO}`;
}

/** "00123" y "123" son el mismo contrato; también ignora espacios, guiones y puntos. */
export function normalizarContrato(contrato: string | undefined | null): string {
  const limpio = normalizarCedula(contrato);
  return /^\d+$/.test(limpio) ? limpio.replace(/^0+(?=\d)/, "") : limpio;
}

/** "abc-234" → "ABC234". */
export function normalizarCodigo(codigo: string | undefined | null): string {
  return normalizarCedula(codigo);
}

/** "ABC234" → "ABC-234", para mostrarlo en el dashboard. */
export function formatearCodigo(codigo: string): string {
  return `${codigo.slice(0, 3)}-${codigo.slice(3)}`;
}

/**
 * Formas en que una cédula pudo quedar escrita en el documento del afiliado:
 * tal cual, sin puntos, o con puntos de miles ("1.234.567").
 */
export function variantesCedula(cedula: string): string[] {
  const tal = cedula.trim();
  const limpia = normalizarCedula(cedula);
  const conPuntos = /^\d+$/.test(limpia) ? limpia.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : limpia;
  return Array.from(new Set([tal, limpia, conPuntos].filter(Boolean)));
}

/**
 * Devuelve el problema del PIN, o null si sirve.
 * Rechaza los PIN que cualquiera adivina primero (111111, 123456, 654321…).
 */
export function problemaDelPin(pin: string): string | null {
  if (!new RegExp(`^\\d{${LARGO_PIN}}$`).test(pin)) {
    return `El PIN debe tener exactamente ${LARGO_PIN} números.`;
  }
  if (/^(\d)\1+$/.test(pin)) return "El PIN no puede ser el mismo número repetido.";
  const digitos = pin.split("").map(Number);
  const pasos = digitos.slice(1).map((d, i) => d - digitos[i]);
  if (pasos.every((p) => p === 1) || pasos.every((p) => p === -1)) {
    return "El PIN no puede ser una secuencia como 123456.";
  }
  return null;
}
