import i18n from "@/i18n";

const locale = () => (i18n.language === "en" ? "en-US" : "es-CO");

/** $ 25.000 — pesos sin decimales. */
export function formatoPesos(valor: number | null | undefined): string {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(valor ?? 0);
}

/** dd/mm/aaaa en UTC: las fechas sin hora se guardan a medianoche UTC (igual que el dashboard). */
export function formatoFecha(iso: string | null | undefined): string {
  if (!iso) return "—";
  const fecha = new Date(iso.length === 10 ? `${iso}T00:00:00.000Z` : iso);
  if (isNaN(fecha.getTime())) return "—";
  return fecha.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
}

/** "2026-08" → "agosto 2026". Datos viejos ("AGOSTO") se muestran tal cual. */
export function formatoPeriodo(periodo: string): string {
  const m = /^(\d{4})-(\d{1,2})$/.exec(periodo.trim());
  if (!m) return periodo;
  const fecha = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1));
  return fecha.toLocaleDateString(locale(), { month: "long", year: "numeric", timeZone: "UTC" });
}

/** Edad cumplida hoy (en UTC, como se guarda la fecha de nacimiento). */
export function calcularEdad(iso: string | null | undefined, hoy: Date = new Date()): number | null {
  if (!iso) return null;
  const n = new Date(iso);
  if (isNaN(n.getTime())) return null;
  let edad = hoy.getUTCFullYear() - n.getUTCFullYear();
  const aunNoCumple = hoy.getUTCMonth() < n.getUTCMonth() || (hoy.getUTCMonth() === n.getUTCMonth() && hoy.getUTCDate() < n.getUTCDate());
  if (aunNoCumple) edad -= 1;
  return edad;
}
