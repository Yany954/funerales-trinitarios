interface Columna<T> {
  encabezado: string;
  render: (fila: T) => React.ReactNode;
}

interface Props<T> {
  columnas: Columna<T>[];
  filas: T[];
  cargando?: boolean;
  vacioTitulo?: string;
  vacioDescripcion?: string;
  claveFila: (fila: T) => string;
}

/**
 * Tabla genérica y responsive: en pantallas angostas se convierte en tarjetas
 * apiladas (cada fila -> una tarjeta con "etiqueta: valor"), en vez de forzar
 * scroll horizontal, para que sea usable desde el celular.
 */
export default function DataTable<T>({
  columnas,
  filas,
  cargando,
  vacioTitulo = "Todavía no hay nada aquí",
  vacioDescripcion = "Los registros que agregues van a aparecer en esta lista.",
  claveFila,
}: Props<T>) {
  if (cargando) {
    return <div className="py-16 text-center text-tinta/50">Cargando…</div>;
  }

  if (filas.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-vino-100 bg-white py-16 text-center">
        <p className="font-display text-lg text-vino-900">{vacioTitulo}</p>
        <p className="mt-1 text-sm text-tinta/60">{vacioDescripcion}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-vino-100 bg-white">
      {/* Vista de tabla — md y más grande */}
      <table className="hidden w-full text-left text-sm md:table">
        <thead className="bg-vino-50 text-vino-900">
          <tr>
            {columnas.map((c) => (
              <th key={c.encabezado} className="px-4 py-3 font-medium">
                {c.encabezado}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-vino-50">
          {filas.map((fila) => (
            <tr key={claveFila(fila)} className="hover:bg-vino-50/50">
              {columnas.map((c) => (
                <td key={c.encabezado} className="px-4 py-3">
                  {c.render(fila)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Vista de tarjetas — pantallas de celular */}
      <div className="divide-y divide-vino-50 md:hidden">
        {filas.map((fila) => (
          <div key={claveFila(fila)} className="space-y-1.5 px-4 py-3">
            {columnas.map((c) => (
              <div key={c.encabezado} className="flex justify-between gap-3 text-sm">
                <span className="text-tinta/50">{c.encabezado}</span>
                <span className="text-right">{c.render(fila)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
