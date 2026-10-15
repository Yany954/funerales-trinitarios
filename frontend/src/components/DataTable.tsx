import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

type ValorOrden = string | number | null | undefined;

interface Columna<T> {
  encabezado: string;
  render: (fila: T) => React.ReactNode;
  /** Si se define, la columna se puede ordenar haciendo clic en el encabezado. */
  orden?: (fila: T) => ValorOrden;
}

interface Props<T> {
  columnas: Columna<T>[];
  filas: T[];
  cargando?: boolean;
  vacioTitulo?: string;
  vacioDescripcion?: string;
  claveFila: (fila: T) => string;
}

type Direccion = "asc" | "desc";

function comparar(a: ValorOrden, b: ValorOrden): number {
  const vacioA = a === null || a === undefined || a === "";
  const vacioB = b === null || b === undefined || b === "";
  if (vacioA || vacioB) return vacioA === vacioB ? 0 : vacioA ? 1 : -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "es", { sensitivity: "base", numeric: true });
}

/**
 * Tabla genérica y responsive: en pantallas angostas se convierte en tarjetas
 * apiladas (cada fila -> una tarjeta con "etiqueta: valor"), en vez de forzar
 * scroll horizontal, para que sea usable desde el celular.
 *
 * En computador la tabla tiene alto máximo con su propio scroll: el encabezado
 * queda fijo arriba y la barra horizontal siempre está a la vista, sin importar
 * cuántas filas haya.
 */
export default function DataTable<T>({
  columnas,
  filas,
  cargando,
  vacioTitulo = "Todavía no hay nada aquí",
  vacioDescripcion = "Los registros que agregues van a aparecer en esta lista.",
  claveFila,
}: Props<T>) {
  const [orden, setOrden] = useState<{ columna: string; direccion: Direccion } | null>(null);

  const filasOrdenadas = useMemo(() => {
    if (!orden) return filas;
    const col = columnas.find((c) => c.encabezado === orden.columna);
    if (!col?.orden) return filas;
    const obtener = col.orden;
    const signo = orden.direccion === "asc" ? 1 : -1;
    return [...filas].sort((a, b) => {
      const va = obtener(a);
      const vb = obtener(b);
      const vacio = (v: ValorOrden) => v === null || v === undefined || v === "";
      if (vacio(va) || vacio(vb)) return comparar(va, vb); // los vacíos siempre al final
      return signo * comparar(va, vb);
    });
  }, [filas, columnas, orden]);

  // Clic: ascendente → descendente → sin ordenar.
  function alternarOrden(encabezado: string) {
    setOrden((actual) => {
      if (actual?.columna !== encabezado) return { columna: encabezado, direccion: "asc" };
      if (actual.direccion === "asc") return { columna: encabezado, direccion: "desc" };
      return null;
    });
  }

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

  const ordenables = columnas.filter((c) => c.orden);

  return (
    <div className="rounded-xl border border-vino-100 bg-white">
      {/* Vista de tabla — md y más grande */}
      <div className="hidden max-h-[70vh] overflow-auto rounded-xl md:block">
        <table className="w-full min-w-max text-left text-sm">
          <thead className="sticky top-0 z-10 bg-vino-50 text-vino-900">
            <tr>
              {columnas.map((c) => {
                const activa = orden?.columna === c.encabezado;
                const Icono = !activa ? ArrowUpDown : orden.direccion === "asc" ? ArrowUp : ArrowDown;
                return (
                  <th key={c.encabezado} className="px-4 py-3 font-medium">
                    {c.orden ? (
                      <button
                        type="button"
                        onClick={() => alternarOrden(c.encabezado)}
                        className="flex items-center gap-1 hover:text-vino-700"
                        title="Ordenar"
                      >
                        {c.encabezado}
                        <Icono size={14} className={activa ? "text-vino-700" : "text-vino-900/30"} />
                      </button>
                    ) : (
                      c.encabezado
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-vino-50">
            {filasOrdenadas.map((fila) => (
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
      </div>

      {/* Vista de tarjetas — pantallas de celular */}
      <div className="md:hidden">
        {ordenables.length > 0 && (
          <div className="flex items-center gap-2 border-b border-vino-50 px-4 py-2 text-sm">
            <span className="text-tinta/50">Ordenar por</span>
            <select
              value={orden?.columna ?? ""}
              onChange={(e) => setOrden(e.target.value ? { columna: e.target.value, direccion: orden?.direccion ?? "asc" } : null)}
              className="flex-1 rounded-lg border border-vino-100 px-2 py-1 text-sm"
            >
              <option value="">Sin orden</option>
              {ordenables.map((c) => (
                <option key={c.encabezado} value={c.encabezado}>{c.encabezado}</option>
              ))}
            </select>
            {orden && (
              <button
                type="button"
                onClick={() => setOrden({ ...orden, direccion: orden.direccion === "asc" ? "desc" : "asc" })}
                className="rounded-lg border border-vino-100 p-1.5 text-vino-700"
                aria-label="Cambiar dirección"
              >
                {orden.direccion === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
              </button>
            )}
          </div>
        )}
        <div className="divide-y divide-vino-50">
          {filasOrdenadas.map((fila) => (
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
    </div>
  );
}
