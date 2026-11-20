/**
 * Beneficios y condiciones de los planes exequiales, transcritos de la hoja
 * "Beneficios y condiciones planes exequiales Funerales Los Trinitarios"
 * (foto enviada por la empresa el 2026-11-20). Las líneas tachadas a mano en
 * la hoja NO se incluyen.
 *
 * Son los valores PREDETERMINADOS: si en el dashboard (Planes) se editan los
 * beneficios de un plan, se guardan en planes_funerarios/{id}.beneficios y
 * esos tienen prioridad. Un plan que no esté aquí (p. ej. "Integral") muestra
 * en la app "pregunta en tu sede".
 *
 * ⚠️ Esta lista está copiada en frontend/src/utils/beneficiosPlan.ts (para
 * prellenar el editor). Un test verifica que sean iguales.
 */

/** Lo que tienen los tres planes. */
export const BENEFICIOS_COMUNES: readonly string[] = [
  "1 suscriptor menor de 69 años.",
  "5 beneficiarios menores de 69 años.",
  "2 beneficiarios (padres o suegros) sin límite de edad.",
  "2 beneficiarios mayores de 70 años, pagando $10.000 adicionales por cada uno.",
  "Fotocopia de las cédulas.",
  "Para la prestación del servicio deben estar al día en el pago de sus cuotas.",
  "Para menores de 69 años, cubre a partir de los 91 días.",
  "Para mayores de 69 años, cubre a partir de los 181 días.",
  "Cubrimiento del 50 % antes de esos períodos, estando al día en el pago.",
  "Trámites legales.",
  "Preservación del cuerpo por 24 horas.",
  "Traslado local e intermunicipal.",
  "Velación en casa o funeraria.",
  "Cinta membreteada.",
  "4 cuñas radiales y tarjeta de condolencias por Facebook.",
  "1 kit de cafetería para 1 noche de velación.",
  "Un arreglo floral.",
  "Ceremonia religiosa o ecuménica.",
  "Carroza fúnebre.",
  "Cuota fija sin incremento anual.",
  "Valor de afiliación: $40.000.",
];

/** Lo que cambia según el plan (va primero en la lista). La clave es el nombre normalizado. */
export const BENEFICIOS_PROPIOS: Readonly<Record<string, readonly string[]>> = {
  girasol: [
    "Cofre forrado.",
    "No cubre traslado a nivel nacional.",
    "Bóveda solo para menores de 70 años (por 1 año) y tapada.",
  ],
  alianza: [
    "Cofre tipo plan básico.",
    "Cubre el 20 % del traslado a nivel nacional.",
    "Bóveda solo para menores de 70 años (por 1 año) y tapada.",
  ],
  bendiciones: [
    "Cofre tipo plan especial.",
    "Cubre el 50 % del traslado a nivel nacional.",
    "Bóveda solo para menores de 70 años (por 2 años) y tapada.",
  ],
};

function normalizar(t: string | undefined | null): string {
  return (t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Beneficios de la hoja para un plan, o null si el plan no está en la hoja. */
export function beneficiosPredeterminados(nombrePlan: string | undefined | null): string[] | null {
  const nombre = normalizar(nombrePlan);
  const clave = Object.keys(BENEFICIOS_PROPIOS).find((k) => nombre.includes(k.replace(/es$/, "")));
  return clave ? [...BENEFICIOS_PROPIOS[clave], ...BENEFICIOS_COMUNES] : null;
}

/** Los guardados en el plan tienen prioridad; si no hay, los de la hoja; si tampoco, ninguno. */
export function beneficiosDelPlan(nombrePlan: string | undefined | null, guardados: string[] | undefined | null): string[] {
  const limpios = (guardados ?? []).map((b) => b.trim()).filter(Boolean);
  if (limpios.length > 0) return limpios;
  return beneficiosPredeterminados(nombrePlan) ?? [];
}
