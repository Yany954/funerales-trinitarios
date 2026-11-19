import { useEffect, useState } from "react";
import { useEstadoCarga, AvisoCarga } from "../hooks/useEstadoCarga";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { Copy, Check, FileText, CircleDollarSign, ArrowLeft, CheckCircle2, ChevronRight, Receipt } from "lucide-react";
import { cambiarEstadoFacturacion, db } from "../api/client";
import DataTable from "../components/DataTable";
import PanelFacturacion from "../components/PanelFacturacion";
import { formatoPesos, formatoFecha } from "../utils/formato";
import { useRol } from "../auth/RolContext";
import type { Servicio, Convenio, EstadoFacturacion } from "../types";
import { confirmarEliminar } from "../utils/confirmar";
import { useSearchParams } from "react-router-dom";

const PASOS: { estado: EstadoFacturacion; titulo: string; icono: typeof FileText; texto: string; chip: string; punto: string }[] = [
  { estado: "pendiente por facturar", titulo: "Por facturar", icono: FileText, texto: "text-amber-700", chip: "bg-amber-50 text-amber-800", punto: "bg-amber-500" },
  { estado: "facturado", titulo: "Facturado, pendiente de pago", icono: CircleDollarSign, texto: "text-vino-700", chip: "bg-vino-50 text-vino-700", punto: "bg-vino-600" },
  { estado: "pagado", titulo: "Pagado", icono: CheckCircle2, texto: "text-green-700", chip: "bg-green-50 text-green-700", punto: "bg-green-600" },
];
const ESTILO_PASO = Object.fromEntries(PASOS.map((p) => [p.estado, p])) as Record<EstadoFacturacion, (typeof PASOS)[number]>;

export default function Facturacion() {
  const { sedeSeleccionada, sedeAsignada, rol, cargando: cargandoRol } = useRol();
  const sedeActiva = rol === "admin" ? sedeSeleccionada : sedeAsignada;

  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const carga = useEstadoCarga();
  const { cargando } = carga;
  const [idCopiado, setIdCopiado] = useState<string | null>(null);
  const [filtroConvenio, setFiltroConvenio] = useState("");
  const [servicioActivo, setServicioActivo] = useState<Servicio | null>(null);
  const [searchParams] = useSearchParams();
  
  const estadoInicial = (searchParams.get("estado") as EstadoFacturacion | null) ?? "todos";
  const [filtroEstado, setFiltroEstado] = useState<EstadoFacturacion | "todos">(estadoInicial);

  useEffect(() => onSnapshot(
    query(collection(db, "convenios")),
    (s) => setConvenios(s.docs.map((d) => ({ id: d.id, ...d.data() } as Convenio))),
    (err) => console.error("Error cargando convenios:", err)
  ), []);

  useEffect(() => {
    if (cargandoRol || !sedeActiva) return;
    const base = collection(db, "servicios");
    const q = sedeActiva === "all"
      ? query(base, orderBy("fechaServicio", "desc"))
      : query(base, where("sede", "==", sedeActiva), orderBy("fechaServicio", "desc"));
    return onSnapshot(
      q,
      (snap) => { setServicios(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Servicio))); carga.listo(); },
      (err) => carga.fallo(err)
    );
  }, [sedeActiva, cargandoRol, carga.intento]);

  if (cargandoRol) return <div className="py-16 text-center text-tinta/70">Cargando…</div>;

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
  // Servicios del convenio elegido (sin filtrar por estado): base de las cifras del flujo.
  const baseConvenio = servicios.filter((s) => !filtroConvenio || s.convenioId === filtroConvenio);

  async function manejarRetroceder(s: Servicio) {
    const estadoAnterior = s.estadoFacturacion === "pagado" ? "facturado" : "pendiente por facturar";
    const confirmado = await confirmarEliminar(`retroceder este servicio a "${estadoAnterior}"`);
    if (!confirmado) return;
    try {
      await cambiarEstadoFacturacion({ servicioId: s.id, nuevoEstado: estadoAnterior });
    } catch (err) {
      console.error("Error al retroceder el estado:", err);
    }
  }
  return (
    <div className="space-y-8">
      <header className="max-w-2xl">
        <h2 className="font-display text-2xl text-vino-900">Facturación de servicios</h2>
        <p className="mt-1 text-sm text-tinta/70">
          El cobro de cada servicio avanza en tres pasos: se factura, queda pendiente de pago y se marca pagado. Toca un paso para ver solo esos servicios.
        </p>
      </header>

      {/* Flujo de cobro: cada paso es también un filtro */}
      <section aria-label="Flujo de cobro" className="grid gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-stretch">
        {PASOS.map((paso, i) => {
          const lista = baseConvenio.filter((s) => s.estadoFacturacion === paso.estado);
          const activo = filtroEstado === paso.estado;
          const Icono = paso.icono;
          return (
            <div key={paso.estado} className="contents">
              <button
                onClick={() => setFiltroEstado(activo ? "todos" : paso.estado)}
                aria-pressed={activo}
                className={`rounded-2xl border bg-white p-5 text-left transition hover:shadow-md ${activo ? "border-vino-600 ring-2 ring-vino-100" : "border-vino-100"}`}
              >
                <p className="flex items-center gap-2 text-sm text-tinta/70">
                  <Icono size={16} aria-hidden="true" /> <span className="font-medium">{i + 1}.</span> {paso.titulo}
                </p>
                <p className={`mt-1 font-display text-3xl tabular-nums ${paso.texto}`}>{formatoPesos(lista.reduce((t, s) => t + (s.valorTotal ?? 0), 0))}</p>
                <p className="text-sm text-tinta/70">{lista.length} {lista.length === 1 ? "servicio" : "servicios"}</p>
              </button>
              {i < PASOS.length - 1 && (
                <div aria-hidden="true" className="hidden items-center justify-center text-vino-400 lg:flex">
                  <ChevronRight size={22} />
                </div>
              )}
            </div>
          );
        })}
      </section>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="fac-convenio" className="mb-1 block text-xs font-medium text-tinta/70">Convenio</label>
          <select id="fac-convenio" value={filtroConvenio} onChange={(e) => setFiltroConvenio(e.target.value)} className="min-w-[14rem] rounded-lg border border-vino-100 bg-white px-3 py-2 text-sm">
            <option value="">Todos los convenios</option>
            {convenios.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="fac-estado" className="mb-1 block text-xs font-medium text-tinta/70">Estado</label>
          <select id="fac-estado" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value as EstadoFacturacion | "todos")} className="min-w-[14rem] rounded-lg border border-vino-100 bg-white px-3 py-2 text-sm">
            <option value="todos">Todos los estados</option>
            <option value="pendiente por facturar">Pendiente por facturar</option>
            <option value="facturado">Facturado (pendiente de pago)</option>
            <option value="pagado">Pagado</option>
          </select>
        </div>
        {(filtroConvenio || filtroEstado !== "todos") && (
          <button onClick={() => { setFiltroConvenio(""); setFiltroEstado("todos"); }} className="min-h-[38px] rounded-lg px-3 text-sm font-medium text-vino-700 hover:bg-vino-50">
            Quitar filtros
          </button>
        )}
        <p className="ml-auto text-sm text-tinta/70">
          {filtrados.length} {filtrados.length === 1 ? "servicio" : "servicios"} · <span className="font-semibold tabular-nums text-tinta">{formatoPesos(filtrados.reduce((t, s) => t + (s.valorTotal ?? 0), 0))}</span>
        </p>
      </div>

      <AvisoCarga carga={carga} />
      <DataTable
        columnas={[
          {
            encabezado: "Servicio",
            orden: (s: Servicio) => s.fallecido.nombreCompleto,
            render: (s: Servicio) => (
              <div className="min-w-[12rem] max-w-[18rem]">
                <p className="font-semibold text-tinta">{s.fallecido.nombreCompleto}</p>
                <p className="flex items-center gap-1 text-xs text-tinta/60">
                  {formatoFecha(s.fechaServicio)} · {s.sede}
                  <button onClick={() => copiarId(s.id)} title="Copiar ID del servicio" aria-label="Copiar ID del servicio" className="rounded p-0.5 hover:text-vino-700">
                    {idCopiado === s.id ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                  </button>
                </p>
              </div>
            ),
          },
          { encabezado: "Convenio", render: (s: Servicio) => convenioDe(s)?.nombre ?? "Sin convenio", orden: (s: Servicio) => convenioDe(s)?.nombre },
          {
            encabezado: "Valor",
            orden: (s: Servicio) => s.valorTotal,
            render: (s: Servicio) => <span className="whitespace-nowrap font-semibold tabular-nums text-tinta">{formatoPesos(s.valorTotal)}</span>,
          },
          {
            encabezado: "Estado",
            orden: (s: Servicio) => PASOS.findIndex((p) => p.estado === s.estadoFacturacion),
            render: (s: Servicio) => {
              const e = ESTILO_PASO[s.estadoFacturacion];
              return (
                <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${e?.chip ?? ""}`}>
                  <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${e?.punto ?? ""}`} />
                  {s.estadoFacturacion === "facturado" ? "pendiente de pago" : s.estadoFacturacion}
                </span>
              );
            },
          },
          {
            encabezado: "Documentos",
            render: (s: Servicio) => (
              <div className="flex items-center gap-1">
                {s.facturaURL ? (
                  <a href={s.facturaURL} target="_blank" rel="noreferrer" title="Ver factura" className="inline-flex items-center gap-1 rounded-full bg-vino-50 px-2.5 py-1 text-xs font-medium text-vino-700 hover:bg-vino-100">
                    <FileText size={12} aria-hidden="true" /> Factura
                  </a>
                ) : null}
                {s.comprobantePagoURL ? (
                  <a href={s.comprobantePagoURL} target="_blank" rel="noreferrer" title="Ver comprobante de pago" className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-100">
                    <Receipt size={12} aria-hidden="true" /> Comprobante
                  </a>
                ) : null}
                {!s.facturaURL && !s.comprobantePagoURL && <span className="text-xs text-tinta/40">—</span>}
              </div>
            ),
          },
          {
            encabezado: "Siguiente paso",
            render: (s: Servicio) => {
              if (rol !== "admin") {
                return <span className="text-xs text-tinta/60">Solo lectura</span>;
              }
              return (
                <div className="flex items-center gap-1">
                  {s.estadoFacturacion === "pagado" ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700"><CheckCircle2 size={14} aria-hidden="true" /> Completo</span>
                  ) : (
                    <button
                      onClick={() => setServicioActivo(s)}
                      className="inline-flex min-h-[34px] items-center gap-1.5 whitespace-nowrap rounded-lg bg-vino-700 px-3 text-xs font-medium text-white transition hover:bg-vino-600"
                    >
                      {s.estadoFacturacion === "pendiente por facturar" ? <FileText size={13} aria-hidden="true" /> : <CircleDollarSign size={13} aria-hidden="true" />}
                      {s.estadoFacturacion === "pendiente por facturar" ? "Marcar facturado" : "Marcar pagado"}
                    </button>
                  )}
                  {s.estadoFacturacion !== "pendiente por facturar" && (
                    <button aria-label="Retroceder estado" onClick={() => manejarRetroceder(s)} title="Retroceder al paso anterior" className="rounded-lg p-1.5 text-tinta/60 hover:bg-vino-50 hover:text-vino-700">
                      <ArrowLeft size={16} aria-hidden="true" />
                    </button>
                  )}
                </div>
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