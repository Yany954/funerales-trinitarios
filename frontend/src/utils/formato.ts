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
  return fecha.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
}
export function calcularEdad(fechaNacimiento: unknown): number | null {
  if (!fechaNacimiento) return null;
  const conToDate = fechaNacimiento as { toDate?: () => Date };
  const fecha = conToDate?.toDate ? conToDate.toDate() : new Date(fechaNacimiento as string);
  if (isNaN(fecha.getTime())) return null;
  const hoy = new Date();
  let edad = hoy.getUTCFullYear() - fecha.getUTCFullYear();
  const diferenciaMeses = hoy.getUTCMonth() - fecha.getUTCMonth();
  if (diferenciaMeses < 0 || (diferenciaMeses === 0 && hoy.getUTCDate() < fecha.getUTCDate())) edad--;
  return edad;
}
export const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

/** "2026-08" → "Agosto 2026". Los datos viejos en texto libre se muestran tal cual. */
export function formatoPeriodo(periodo: string): string {
  const m = /^(\d{4})-(\d{1,2})$/.exec(periodo);
  return m ? `${MESES[Number(m[2]) - 1]} ${m[1]}` : periodo;
}

/** Saca mes y año de un período nuevo ("2026-08") o de uno viejo en texto ("AGOSTO"). */
export function desglosarPeriodo(periodo: string, fechaPago: unknown): { mes: number; anio: number } {
  const m = /^(\d{4})-(\d{1,2})$/.exec(periodo);
  if (m) return { anio: Number(m[1]), mes: Number(m[2]) };
  const norm = periodo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const idx = MESES.findIndex((n) => norm.includes(n.toLowerCase()));
  const f = new Date(fechaPago as string);
  return { anio: f.getFullYear(), mes: idx >= 0 ? idx + 1 : f.getMonth() + 1 };
}