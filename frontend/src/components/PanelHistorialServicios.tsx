import { useEffect, useState } from "react";
import { X, Copy, Check } from "lucide-react";
import { listarServiciosPorAfiliado } from "../api/client";
import { formatoPesos, formatoFecha } from "../utils/formato";
import type { Afiliado, ServicioResumen } from "../types";

interface Props {
  afiliado: Afiliado;
  onCerrar: () => void;
}

export default function PanelHistorialServicios({ afiliado, onCerrar }: Props) {
  const [servicios, setServicios] = useState<ServicioResumen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [idCopiado, setIdCopiado] = useState<string | null>(null);

  useEffect(() => {
    listarServiciosPorAfiliado(afiliado.cedula)
      .then(setServicios)
      .catch((err) => console.error("Error cargando servicios:", err))
      .finally(() => setCargando(false));
  }, [afiliado.cedula]);

  function copiarId(id: string) {
    navigator.clipboard.writeText(id);
    setIdCopiado(id);
    setTimeout(() => setIdCopiado(null), 1500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-tinta/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg text-vino-900">Servicios — {afiliado.nombreCompleto}</h3>
            <p className="text-xs text-tinta/50">Cédula titular {afiliado.cedula}</p>
          </div>
          <button onClick={onCerrar} className="text-tinta/40 hover:text-tinta"><X size={20} /></button>
        </div>

        {cargando ? (
          <p className="text-sm text-tinta/50">Cargando…</p>
        ) : servicios.length === 0 ? (
          <p className="text-sm text-tinta/50">Este afiliado todavía no tiene servicios registrados.</p>
        ) : (
          <ul className="divide-y divide-vino-50">
            {servicios.map((s) => (
              <li key={s.id} className="space-y-1 py-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-vino-900">{formatoFecha(s.fechaServicio)} — {s.sede}</span>
                  <button onClick={() => copiarId(s.id)} className="flex items-center gap-1 font-mono text-xs text-tinta/50 hover:text-vino-700">
                    {s.id.slice(0, 8)}…
                    {idCopiado === s.id ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-tinta/60">
                  <span>{s.tipoServicio}</span>
                  <span>· {formatoPesos(s.valorTotal)}</span>
                  <span className={`rounded-full px-2 py-0.5 ${
                    s.estadoFacturacion === "pagado" ? "bg-green-50 text-green-700"
                    : s.estadoFacturacion === "facturado" ? "bg-blue-50 text-blue-700"
                    : "bg-amber-50 text-amber-700"
                  }`}>
                    {s.estadoFacturacion}
                  </span>
                  {s.facturaURL && <a href={s.facturaURL} target="_blank" rel="noreferrer" className="text-vino-700 hover:underline">Ver factura</a>}
                  {s.comprobantePagoURL && <a href={s.comprobantePagoURL} target="_blank" rel="noreferrer" className="text-vino-700 hover:underline">Ver comprobante</a>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}