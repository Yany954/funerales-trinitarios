import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { Copy, Check, FileText, CircleDollarSign } from "lucide-react";
import { db } from "../api/client";
import DataTable from "../components/DataTable";
import PanelFacturacion from "../components/PanelFacturacion";
import { formatoPesos, formatoFecha } from "../utils/formato";
import { useRol } from "../auth/RolContext";
import type { Servicio, Convenio, EstadoFacturacion } from "../types";

export default function Facturacion() {
  const { sedeSeleccionada, sedeAsignada, rol, cargando: cargandoRol } = useRol();
  const sedeActiva = rol === "admin" ? sedeSeleccionada : sedeAsignada;

  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [idCopiado, setIdCopiado] = useState<string | null>(null);
  const [filtroConvenio, setFiltroConvenio] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<EstadoFacturacion | "todos">("todos");
  const [servicioActivo, setServicioActivo] = useState<Servicio | null>(null);

  useEffect(() => onSnapshot(query(collection(db, "convenios")), (s) => setConvenios(s.docs.map((d) => ({ id: d.id, ...d.data() } as Convenio)))), []);

  useEffect(() => {
    if (cargandoRol || !sedeActiva) return;
    const base = collection(db, "servicios");
    const q = sedeActiva === "all"
      ? query(base, orderBy("fechaServicio", "desc"))
      : query(base, where("sede", "==", sedeActiva), orderBy("fechaServicio", "desc"));
    return onSnapshot(
      q,
      (snap) => { setServicios(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Servicio))); setCargando(false); },
      (err) => console.error("Error en la consulta:", err)
    );
  }, [sedeActiva, cargandoRol]);

  if (cargandoRol) return <div className="py-16 text-center text-tinta/50">Cargando…</div>;

  function copiarId(id: string) {
    navigator.clipboard.writeText(id);
    setIdCopiado(id);
    setTimeout(() => setIdCopiado(null), 1500);
  }

  const convenioDe = (s: Servicio) => convenios.find((c) => c.id === s.convenioId) ?? null;
  const filtrados = servicios.filter((s) => {
    if (filtroConvenio && s.convenioId !== filtroConvenio) return false;
    if (filtroEstado !== "todos" && s.estadoFacturacion !== filtroEstado) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <h2 className="font-display text-lg text-vino-900">Facturación de servicios</h2>

      <div className="flex flex-wrap gap-2 rounded-xl border border-vino-100 bg-white p-3">
        <select value={filtroConvenio} onChange={(e) => setFiltroConvenio(e.target.value)} className="rounded-lg border border-vino-100 px-3 py-1.5 text-sm">
          <option value="">Todos los convenios</option>
          {convenios.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value as EstadoFacturacion | "todos")} className="rounded-lg border border-vino-100 px-3 py-1.5 text-sm">
          <option value="todos">Todos los estados</option>
          <option value="pendiente por facturar">Pendiente por facturar</option>
          <option value="facturado">Facturado</option>
          <option value="pagado">Pagado</option>
        </select>
      </div>

      <DataTable
        columnas={[
          {
            encabezado: "ID",
            render: (s: Servicio) => (
              <button onClick={() => copiarId(s.id)} className="flex items-center gap-1 font-mono text-xs text-tinta/50 hover:text-vino-700">
                {s.id.slice(0, 8)}…
                {idCopiado === s.id ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
              </button>
            ),
          },
          { encabezado: "Fecha", render: (s: Servicio) => formatoFecha(s.fechaServicio) },
          { encabezado: "Fallecido", render: (s: Servicio) => s.fallecido.nombreCompleto },
          { encabezado: "Convenio", render: (s: Servicio) => convenioDe(s)?.nombre ?? "Sin convenio" },
          { encabezado: "Sede", render: (s: Servicio) => s.sede },
          { encabezado: "Valor", render: (s: Servicio) => formatoPesos(s.valorTotal) },
          {
            encabezado: "Estado",
            render: (s: Servicio) => (
              <span className={`rounded-full px-2.5 py-1 text-xs ${s.estadoFacturacion === "pagado" ? "bg-green-50 text-green-700"
                  : s.estadoFacturacion === "facturado" ? "bg-blue-50 text-blue-700"
                    : "bg-amber-50 text-amber-700"
                }`}>
                {s.estadoFacturacion}
              </span>
            ),
          },
          {
            encabezado: "Factura",
            render: (s: Servicio) =>
              s.facturaURL ? (
                <a href={s.facturaURL} target="_blank" rel="noreferrer" className="text-vino-700 hover:underline">Ver</a>
              ) : (
                <span className="text-xs text-tinta/40">—</span>
              ),
          },
          {
            encabezado: "Comprobante",
            render: (s: Servicio) =>
              s.comprobantePagoURL ? (
                <a href={s.comprobantePagoURL} target="_blank" rel="noreferrer" className="text-vino-700 hover:underline">Ver</a>
              ) : (
                <span className="text-xs text-tinta/40">—</span>
              ),
          },
          {
            encabezado: "Acción",
            render: (s: Servicio) => {
              if (rol !== "admin") {
                return <span className="text-xs text-tinta/40">Solo lectura</span>;
              }
              return s.estadoFacturacion === "pagado" ? (
                <span className="text-xs text-tinta/40">Completo</span>
              ) : (
                <button onClick={() => setServicioActivo(s)} className="flex items-center gap-1 text-xs text-vino-700 hover:underline">
                  {s.estadoFacturacion === "pendiente por facturar" ? <FileText size={13} /> : <CircleDollarSign size={13} />}
                  {s.estadoFacturacion === "pendiente por facturar" ? "Marcar facturado" : "Marcar pagado"}
                </button>
              );
            },
          },
        ]}
        filas={filtrados}
        cargando={cargando}
        claveFila={(s) => s.id}
        vacioTitulo="No hay servicios en este filtro"
        vacioDescripcion="Ajusta los filtros de arriba, o espera a que se registren servicios nuevos."
      />

      {servicioActivo && (
        <PanelFacturacion servicio={servicioActivo} convenio={convenioDe(servicioActivo)} onCerrar={() => setServicioActivo(null)} />
      )}
    </div>
  );
}