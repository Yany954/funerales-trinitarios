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

/**
 * Cada mes pagado cubre hasta el mismo día de la afiliación del mes siguiente.
 * Sin pagos, cuenta como cubierto el mes de la afiliación.
 * Afiliado el 20/06 con agosto pagado → próximo vencimiento 20/09.
 */
export function proximoVencimiento(fechaAfiliacionReal: Date, periodoCubiertoHasta?: string): Date {
  const dia = fechaAfiliacionReal.getUTCDate();
  let anio = fechaAfiliacionReal.getUTCFullYear();
  let mes = fechaAfiliacionReal.getUTCMonth();

  if (periodoCubiertoHasta) {
    const [a, m] = periodoCubiertoHasta.split("-").map(Number);
    if (a * 12 + (m - 1) > anio * 12 + mes) {
      anio = a;
      mes = m - 1;
    }
  }

  mes += 1;
  if (mes > 11) {
    mes = 0;
    anio += 1;
  }
  return new Date(Date.UTC(anio, mes, Math.min(dia, diasEnMes(anio, mes))));
}

/** 1 día de gracia después del vencimiento; pasado ese día queda en mora. */
export function estadoSegunMora(fechaAfiliacionReal: Date, periodoCubiertoHasta?: string, hoy: Date = new Date()): "activo" | "en mora" {
  const limite = proximoVencimiento(fechaAfiliacionReal, periodoCubiertoHasta).getTime() + 24 * 60 * 60 * 1000;
  return hoy.getTime() > limite ? "en mora" : "activo";
}