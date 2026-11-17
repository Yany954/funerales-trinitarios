const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

function sinAcentos(t: string): string {
  return t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/** "2026-08" queda igual; "AGOSTO" (dato viejo) pasa a "2026-08" usando el año del pago. */
export function claveDePeriodo(periodo: string, fechaPago: Date): string | null {
  const texto = periodo.trim();
  const m = /^(\d{4})-(\d{1,2})$/.exec(texto);
  if (m) {
    const mes = Number(m[2]);
    return mes >= 1 && mes <= 12 ? `${m[1]}-${String(mes).padStart(2, "0")}` : null;
  }
  const norm = sinAcentos(texto).replace("setiembre", "septiembre");
  const idx = MESES.findIndex((n) => norm.includes(n));
  return idx < 0 ? null : `${fechaPago.getUTCFullYear()}-${String(idx + 1).padStart(2, "0")}`;
}

/** El período más reciente entre todos los pagos, por ejemplo "2026-08". */
export function periodoMasReciente(pagos: { periodoCubierto: string; fecha: Date }[]): string | undefined {
  const claves = pagos
    .map((p) => claveDePeriodo(p.periodoCubierto, p.fecha))
    .filter((c): c is string => c !== null)
    .sort();
  return claves[claves.length - 1];
}

function diasEnMes(anio: number, mes0: number): number {
  return new Date(Date.UTC(anio, mes0 + 1, 0)).getUTCDate();
}

/** Fecha de hoy en Colombia como "aaaa-mm-dd" (el servidor corre en UTC). */
export function hoyEnColombia(hoy: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(hoy);
}

function aClave(anio: number, mes0: number, dia: number): string {
  return `${anio}-${String(mes0 + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/**
 * Último día cubierto (inclusive), como "aaaa-mm-dd".
 * Sin pagos solo cubre el mismo día de la afiliación: si no paga ese día o antes, queda en mora.
 * Cada mes pagado cubre hasta el mismo día del mes siguiente.
 * Afiliado el 17/10 con octubre pagado → cubierto hasta el 17/11; el 18/11 queda en mora.
 */
export function cubiertoHasta(fechaInicio: Date, periodoCubiertoHasta?: string): string {
  const dia = fechaInicio.getUTCDate();
  const anioInicio = fechaInicio.getUTCFullYear();
  const mesInicio = fechaInicio.getUTCMonth();

  if (periodoCubiertoHasta) {
    const [a, m] = periodoCubiertoHasta.split("-").map(Number);
    if (a * 12 + (m - 1) >= anioInicio * 12 + mesInicio) {
      let anio = a;
      let mes = m; // el mes siguiente al pagado (0-based: m - 1 + 1)
      if (mes > 11) {
        mes = 0;
        anio += 1;
      }
      return aClave(anio, mes, Math.min(dia, diasEnMes(anio, mes)));
    }
  }
  return aClave(anioInicio, mesInicio, dia);
}

/** Sin días de gracia: el día siguiente al último día cubierto ya queda en mora. */
export function estadoSegunMora(fechaInicio: Date, periodoCubiertoHasta?: string, hoy: Date = new Date()): "activo" | "en mora" {
  return hoyEnColombia(hoy) > cubiertoHasta(fechaInicio, periodoCubiertoHasta) ? "en mora" : "activo";
}
