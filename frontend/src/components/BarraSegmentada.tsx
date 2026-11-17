/**
 * Barra de avance por segmentos (patrón del widget-2 de Watermelon UI,
 * rehecho con la paleta de la empresa y sin dependencias nuevas).
 * Ej.: "3 de 5 convenios tienen tarifa 2026".
 */
export function BarraSegmentada({
  valor,
  total,
  etiqueta,
  segmentos,
}: {
  valor: number;
  total: number;
  /** Texto que leen los lectores de pantalla, ej. "Convenios con tarifa 2026". */
  etiqueta: string;
  /** Por defecto uno por elemento (máx. 12); si hay más, se agrupan. */
  segmentos?: number;
}) {
  const n = Math.max(1, Math.min(segmentos ?? total, 12));
  const progreso = total > 0 ? Math.min(Math.max(valor / total, 0), 1) : 0;
  return (
    <div
      role="meter"
      aria-label={etiqueta}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={valor}
      aria-valuetext={`${valor} de ${total}`}
      className="flex h-2.5 w-full gap-1.5"
    >
      {Array.from({ length: n }).map((_, i) => {
        const lleno = Math.min(Math.max(progreso * n - i, 0), 1);
        return (
          <div key={i} className="relative flex-1 overflow-hidden rounded-full bg-vino-100">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-vino-700 transition-[width] duration-500"
              style={{ width: `${lleno * 100}%` }}
            />
          </div>
        );
      })}
    </div>
  );
}

/** Colores de la marca para series (vino → buganvilla), en orden de contraste. */
export const COLORES_MARCA = ["#5E2138", "#C2478A", "#B14E72", "#3A1423", "#7A2C48", "#9C3D6E", "#8E5A6F"];

/**
 * Barra apilada con leyenda: cómo se reparte un total entre categorías
 * (ej. afiliados por plan). Cada parte también aparece como texto en la leyenda,
 * así que no depende solo del color.
 */
export function BarraDistribucion({
  partes,
  etiqueta,
}: {
  partes: { nombre: string; valor: number }[];
  etiqueta: string;
}) {
  const total = partes.reduce((t, p) => t + p.valor, 0);
  if (total === 0) return null;
  return (
    <figure aria-label={etiqueta} className="space-y-3">
      <div className="flex h-3 w-full gap-1 overflow-hidden rounded-full" aria-hidden="true">
        {partes
          .filter((p) => p.valor > 0)
          .map((p, i) => (
            <div
              key={p.nombre}
              className="h-full first:rounded-l-full last:rounded-r-full"
              style={{ width: `${(p.valor / total) * 100}%`, background: COLORES_MARCA[i % COLORES_MARCA.length] }}
              title={`${p.nombre}: ${p.valor}`}
            />
          ))}
      </div>
      <figcaption>
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-tinta/70">
          {partes
            .filter((p) => p.valor > 0)
            .map((p, i) => (
              <li key={p.nombre} className="flex items-center gap-1.5">
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: COLORES_MARCA[i % COLORES_MARCA.length] }} />
                <span className="font-medium text-tinta">{p.nombre}</span>
                <span className="tabular-nums">
                  {p.valor} ({Math.round((p.valor / total) * 100)} %)
                </span>
              </li>
            ))}
        </ul>
      </figcaption>
    </figure>
  );
}
