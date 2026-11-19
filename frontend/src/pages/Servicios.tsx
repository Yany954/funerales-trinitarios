import { useEffect, useState, FormEvent } from "react";
import { useEstadoCarga, AvisoCarga } from "../hooks/useEstadoCarga";
import { collection, onSnapshot, orderBy, query, where, Timestamp } from "firebase/firestore";
import { Plus, Trash2, ClipboardList, Copy, Check, Pencil, Paperclip, CalendarDays, FileText, CircleDollarSign } from "lucide-react";
import Modal from "../components/Modal";
import { Link, useSearchParams } from "react-router-dom";
import { db, registrarServicio, actualizarServicio, eliminarServicio } from "../api/client";
import DataTable from "../components/DataTable";
import SubirDocumento from "../components/SubirDocumento";
import CampoPrecio from "../components/CampoPrecio";
import { useRol } from "../auth/RolContext";
import { confirmarEliminar } from "../utils/confirmar";
import { formatoFecha, formatoPesos } from "../utils/formato";
import type { Servicio, ItemServicio, TipoServicio, TipoTraslado, Convenio, TipoCofre, Flor, TarifaConvenio } from "../types";

const SEDES = ["Pailitas", "Tamalameque", "Pelaya", "Curumaní"] as const;

/** ¿El enlace de Storage es una foto? (para mostrar vista previa en vez del ícono de PDF) */
function esImagen(url: string): boolean {
  const ruta = decodeURIComponent(url.split("?")[0]);
  return /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(ruta);
}

/** Colores por estado de facturación (mismos en Servicios y Facturación). */
const ESTILO_FACTURACION: Record<string, { chip: string; punto: string }> = {
  "pendiente por facturar": { chip: "bg-amber-50 text-amber-800", punto: "bg-amber-500" },
  facturado: { chip: "bg-vino-50 text-vino-700", punto: "bg-vino-600" },
  pagado: { chip: "bg-green-50 text-green-700", punto: "bg-green-600" },
};

function itemVacio(): ItemServicio {
  return { concepto: "", cantidad: 1, valorUnitario: 0, valorTotal: 0 };
}

function aInputDate(valor: unknown): string {
  if (valor instanceof Timestamp) return valor.toDate().toISOString().slice(0, 10);
  return "";
}

export default function Servicios() {
  const { rol, sedeAsignada, sedeSeleccionada, cargando: cargandoRol } = useRol();
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const carga = useEstadoCarga();
  const { cargando } = carga;
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [cofres, setCofres] = useState<TipoCofre[]>([]);
  const [flores, setFlores] = useState<Flor[]>([]);
  const [idCopiado, setIdCopiado] = useState<string | null>(null);
  // Viene de Bóvedas: /servicios?servicio=ID muestra solo ese servicio.
  const [searchParams, setSearchParams] = useSearchParams();
  const servicioEnfocado = searchParams.get("servicio");

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [documentosDe, setDocumentosDe] = useState<Servicio | null>(null);
  const [filtroResumen, setFiltroResumen] = useState<"todos" | "mes" | "pendiente por facturar" | "facturado">("todos");
  const [editando, setEditando] = useState<Servicio | null>(null);
  const [items, setItems] = useState<ItemServicio[]>([itemVacio()]);
  const [documentos, setDocumentos] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [convenioIdForm, setConvenioIdForm] = useState<string>("");
  const [tarifaConvenio, setTarifaConvenio] = useState<TarifaConvenio | null>(null);
  const [esAfiliadoForm, setEsAfiliadoForm] = useState(false);
  const [usaBovedaForm, setUsaBovedaForm] = useState(false);
  const [valorBovedaForm, setValorBovedaForm] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (cargandoRol) return;
    const base = collection(db, "servicios");
    const q = sedeSeleccionada === "all"
      ? query(base, orderBy("fechaServicio", "desc"))
      : query(base, where("sede", "==", sedeSeleccionada), orderBy("fechaServicio", "desc"));
    return onSnapshot(
      q,
      (snap) => { setServicios(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Servicio))); carga.listo(); },
      (err) => carga.fallo(err)
    );
  }, [sedeSeleccionada, cargandoRol, carga.intento]);

  // Catálogos del formulario: si fallan, el formulario sigue funcionando con listas vacías.
  useEffect(() => onSnapshot(
    query(collection(db, "convenios")),
    (s) => setConvenios(s.docs.map((d) => ({ id: d.id, ...d.data() } as Convenio))),
    (err) => console.error("Error cargando convenios:", err)
  ), []);
  useEffect(() => onSnapshot(
    query(collection(db, "tipos_cofre")),
    (s) => setCofres(s.docs.map((d) => ({ id: d.id, ...d.data() } as TipoCofre))),
    (err) => console.error("Error cargando tipos de cofre:", err)
  ), []);
  useEffect(() => onSnapshot(
    query(collection(db, "flores")),
    (s) => setFlores(s.docs.map((d) => ({ id: d.id, ...d.data() } as Flor))),
    (err) => console.error("Error cargando flores:", err)
  ), []);

  useEffect(() => {
    if (!convenioIdForm) { setTarifaConvenio(null); return; }
    return onSnapshot(
      query(collection(db, "convenios", convenioIdForm, "tarifas"), orderBy("anio", "desc")),
      (snap) => setTarifaConvenio(snap.empty ? null : (snap.docs[0].data() as TarifaConvenio)),
      (err) => console.error("Error cargando tarifa del convenio:", err)
    );
  }, [convenioIdForm]);

  if (cargandoRol) return <div className="py-16 text-center text-tinta/70">Cargando…</div>;

  const hoyMs = new Date();
  const delMes = servicios.filter((s) => {
    const f = (s.fechaServicio as { toDate?: () => Date })?.toDate?.();
    return !!f && f.getUTCFullYear() === hoyMs.getUTCFullYear() && f.getUTCMonth() === hoyMs.getUTCMonth();
  });
  const porEstado = (estado: Servicio["estadoFacturacion"]) => servicios.filter((s) => s.estadoFacturacion === estado);
  const filtradosResumen =
    filtroResumen === "todos" ? servicios : filtroResumen === "mes" ? delMes : porEstado(filtroResumen);

  function copiarId(id: string) {
    navigator.clipboard.writeText(id);
    setIdCopiado(id);
    setTimeout(() => setIdCopiado(null), 1500);
  }

  function actualizarItem(i: number, campo: keyof ItemServicio, valor: string) {
    setItems((prev) => {
      const copia = [...prev];
      const item = { ...copia[i], [campo]: campo === "concepto" ? valor : Number(valor) };
      item.valorTotal = item.cantidad * item.valorUnitario;
      copia[i] = item;
      return copia;
    });
  }

  function agregarDesdeCofre(cofreId: string) {
    const cofre = cofres.find((c) => c.id === cofreId);
    if (!cofre) return;
    setItems((prev) => [...prev, { concepto: `Cofre ${cofre.referencia} (${cofre.nivel ?? cofre.categoria})`, cantidad: 1, valorUnitario: cofre.precio, valorTotal: cofre.precio }]);
  }

  function agregarDesdeFlor(florId: string) {
    const flor = flores.find((f) => f.id === florId);
    if (!flor) return;
    setItems((prev) => [...prev, { concepto: `Flores: ${flor.nombre}`, cantidad: 1, valorUnitario: flor.precioPublico, valorTotal: flor.precioPublico }]);
  }

const OPCIONES_TARIFA: { campo: keyof TarifaConvenio; etiqueta: string }[] = [
  { campo: "servicioCompletoBasico", etiqueta: "Servicio completo básico" },
  { campo: "servicioCompletoSemilujo", etiqueta: "Servicio completo semilujo" },
  { campo: "servicioCompletoLujo", etiqueta: "Servicio completo lujo" },
  { campo: "iniciales", etiqueta: "Iniciales" },
  { campo: "finales", etiqueta: "Finales" },
  { campo: "trasladoLocal", etiqueta: "Traslado local" },
  { campo: "trasladoFluvial", etiqueta: "Traslado fluvial" },
  { campo: "precioCofre", etiqueta: "Cofre (del convenio)" },
  { campo: "precioBoveda", etiqueta: "Bóveda (del convenio)" },
];

  function agregarDesdeTarifa(campo: keyof TarifaConvenio) {
    if (!tarifaConvenio) return;
    const valor = tarifaConvenio[campo] as number | undefined;
    if (!valor) return;
    const etiqueta = OPCIONES_TARIFA.find((o) => o.campo === campo)?.etiqueta ?? String(campo);
    setItems((prev) => [...prev, { concepto: etiqueta, cantidad: 1, valorUnitario: valor, valorTotal: valor }]);
  }

  const totalServicio = items.reduce((s, it) => s + it.valorTotal, 0) + (usaBovedaForm ? (valorBovedaForm ?? 0) : 0);

  function abrirParaCrear() {
    setEditando(null);
    setItems([itemVacio()]);
    setDocumentos([]);
    setConvenioIdForm("");
    setEsAfiliadoForm(false);
    setUsaBovedaForm(false);
    setValorBovedaForm(undefined);
    setMostrarFormulario(true);
  }

  function abrirParaEditar(servicio: Servicio) {
    setEditando(servicio);
    setItems(servicio.itemsServicio.length ? servicio.itemsServicio.filter((i) => i.concepto !== "Bóveda") : [itemVacio()]);
    setDocumentos(servicio.documentosAdjuntos ?? []);
    setConvenioIdForm(servicio.convenioId ?? "");
    setEsAfiliadoForm(servicio.esAfiliado ?? false);
    setUsaBovedaForm(servicio.usoBoveda.usada);
    setValorBovedaForm(servicio.itemsServicio.find((i) => i.concepto === "Bóveda")?.valorUnitario);
    setMostrarFormulario(true);
  }

  async function manejarGuardar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    const form = new FormData(e.currentTarget);
    const itemsValidos = items.filter((it) => it.concepto.trim() !== "");
    try {
      if (editando) {
        await actualizarServicio({
          id: editando.id,
          fechaServicio: String(form.get("fechaServicio")),
          convenioId: String(form.get("convenioId")),
          esAfiliado: esAfiliadoForm,
          cedulaTitular: esAfiliadoForm ? String(form.get("cedulaTitular")) : undefined,
          fallecido: { nombreCompleto: String(form.get("fallecidoNombre")), cedula: String(form.get("fallecidoCedula") || "") || undefined },
          tipoServicio: String(form.get("tipoServicio")) as TipoServicio,
          tipoTraslado: String(form.get("tipoTraslado")) as TipoTraslado,
          usaBoveda: usaBovedaForm,
          valorBoveda: usaBovedaForm ? Number(form.get("valorBovedaCampo") || 0) : undefined,
          tuvoMisaOCulto: String(form.get("tuvoMisaOCulto")) as "misa" | "culto" | "ninguno",
          itemsServicio: itemsValidos,
          documentosAdjuntos: documentos,
        });
      } else {
        await registrarServicio({
          fechaServicio: String(form.get("fechaServicio")),
          sede: (rol === "admin" ? String(form.get("sede")) : sedeAsignada) as Servicio["sede"],
          convenioId: String(form.get("convenioId")),
          esAfiliado: esAfiliadoForm,
          cedulaTitular: esAfiliadoForm ? String(form.get("cedulaTitular")) : undefined,
          fallecido: { nombreCompleto: String(form.get("fallecidoNombre")), cedula: String(form.get("fallecidoCedula") || "") || undefined },
          tipoServicio: String(form.get("tipoServicio")) as TipoServicio,
          tipoTraslado: String(form.get("tipoTraslado")) as TipoTraslado,
          usaBoveda: usaBovedaForm,
          valorBoveda: usaBovedaForm ? Number(form.get("valorBovedaCampo") || 0) : undefined,
          tuvoMisaOCulto: String(form.get("tuvoMisaOCulto")) as "misa" | "culto" | "ninguno",
          itemsServicio: itemsValidos,
        });
      }
      setMostrarFormulario(false);
      setEditando(null);
      setItems([itemVacio()]);
      setDocumentos([]);
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el servicio.");
    } finally {
      setGuardando(false);
    }
  }

  async function manejarEliminar(s: Servicio) {
    const confirmado = await confirmarEliminar(s.fallecido.nombreCompleto);
    if (!confirmado) return;
    try {
      await eliminarServicio(s.id);
    } catch (err) {
      console.error("Error eliminando servicio:", err);
    }
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h2 className="font-display text-2xl text-vino-900">Servicios</h2>
          <p className="mt-1 text-sm text-tinta/70">
            Cada servicio funerario prestado: a quién, con qué convenio, cuánto costó y en qué va su cobro.
          </p>
        </div>
        <button
          onClick={abrirParaCrear}
          className="flex min-h-[44px] items-center gap-2 rounded-lg bg-vino-700 px-4 text-sm font-medium text-white transition hover:bg-vino-600 active:translate-y-px"
        >
          <ClipboardList size={16} aria-hidden="true" /> Nuevo servicio
        </button>
      </header>

      {!servicioEnfocado && servicios.length > 0 && (
        <section aria-label="Resumen" className="grid gap-3 sm:grid-cols-3">
          {([
            { clave: "mes", titulo: "Este mes", icono: CalendarDays, lista: delMes, clase: "text-vino-900" },
            { clave: "pendiente por facturar", titulo: "Por facturar", icono: FileText, lista: porEstado("pendiente por facturar"), clase: "text-amber-700" },
            { clave: "facturado", titulo: "Pendientes de pago", icono: CircleDollarSign, lista: porEstado("facturado"), clase: "text-vino-700" },
          ] as const).map((c) => {
            const activo = filtroResumen === c.clave;
            const Icono = c.icono;
            return (
              <button
                key={c.clave}
                onClick={() => setFiltroResumen(activo ? "todos" : c.clave)}
                aria-pressed={activo}
                className={`rounded-2xl border bg-white p-5 text-left transition hover:shadow-md ${activo ? "border-vino-600 ring-2 ring-vino-100" : "border-vino-100"}`}
              >
                <p className="flex items-center gap-2 text-sm text-tinta/70"><Icono size={16} aria-hidden="true" /> {c.titulo}</p>
                <p className={`mt-1 font-display text-3xl tabular-nums ${c.clase}`}>{c.lista.length}</p>
                <p className="text-sm tabular-nums text-tinta/70">{formatoPesos(c.lista.reduce((t, s) => t + (s.valorTotal ?? 0), 0))}</p>
              </button>
            );
          })}
        </section>
      )}

      {mostrarFormulario && (
        <Modal
          titulo={editando ? `Editar servicio de ${editando.fallecido.nombreCompleto}` : "Nuevo servicio"}
          onCerrar={() => { setMostrarFormulario(false); setEditando(null); setError(null); }}
          ancho="max-w-4xl"
        >
        <form onSubmit={manejarGuardar} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <input name="fechaServicio" type="date" min="1900-01-01" max="2100-12-31" required defaultValue={editando ? aInputDate(editando.fechaServicio) : undefined} className="rounded-lg border border-vino-100 px-3 py-2 text-sm" />
            {!editando && (
              rol === "admin" ? (
                <select aria-label="Sede" name="sede" required className="rounded-lg border border-vino-100 px-3 py-2 text-sm">
                  <option value="">Sede…</option>
                  {SEDES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              ) : (
                <input type="hidden" name="sede" value={sedeAsignada ?? ""} />
              )
            )}
            <input name="fallecidoNombre" required defaultValue={editando?.fallecido.nombreCompleto} placeholder="Nombre del fallecido" aria-label="Nombre del fallecido" className="rounded-lg border border-vino-100 px-3 py-2 text-sm" />
            <input name="fallecidoCedula" required defaultValue={editando?.fallecido.cedula} placeholder="Cédula del fallecido" aria-label="Cédula del fallecido" className="rounded-lg border border-vino-100 px-3 py-2 text-sm" />
            <select aria-label="Sin convenio (afiliado/particular)" name="convenioId" defaultValue={editando?.convenioId} onChange={(e) => setConvenioIdForm(e.target.value)} className="rounded-lg border border-vino-100 px-3 py-2 text-sm">
              <option value="">Sin convenio (afiliado/particular)</option>
              {convenios.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} ({c.tipo === "interno" ? "afiliado/particular" : c.tipo === "alcaldia" ? "alcaldía" : "empresa"})
                </option>
              ))}
            </select>
            <select aria-label="Tipo de servicio" name="tipoServicio" required defaultValue={editando?.tipoServicio} className="rounded-lg border border-vino-100 px-3 py-2 text-sm">
              <option value="">Tipo de servicio…</option>
              <option value="traslado">Traslado</option>
              <option value="servicio completo">Servicio completo</option>
              <option value="traslado + servicio completo">Traslado + servicio completo</option>
            </select>
            <select name="tipoTraslado" required defaultValue={editando?.tipoTraslado ?? "ninguno"} className="rounded-lg border border-vino-100 px-3 py-2 text-sm">
              <option value="ninguno">Sin traslado</option>
              <option value="local">Traslado local</option>
              <option value="fluvial">Traslado fluvial</option>
            </select>
            <select name="tuvoMisaOCulto" required defaultValue={editando?.tuvoMisaOCulto ?? "ninguno"} className="rounded-lg border border-vino-100 px-3 py-2 text-sm">
              <option value="ninguno">Sin misa ni culto</option>
              <option value="misa">Misa</option>
              <option value="culto">Culto</option>
            </select>

            <label className="flex items-center gap-2 text-sm text-tinta/70">
              <input type="checkbox" checked={esAfiliadoForm} onChange={(e) => setEsAfiliadoForm(e.target.checked)} />
              Es un servicio para un afiliado
            </label>
            {esAfiliadoForm && (
              <input name="cedulaTitular" required defaultValue={editando?.cedulaTitular} placeholder="Cédula del titular del plan" aria-label="Cédula del titular del plan" className="rounded-lg border border-vino-100 px-3 py-2 text-sm" />
            )}

            <label className="flex items-center gap-2 text-sm text-tinta/70">
              <input type="checkbox" checked={usaBovedaForm} onChange={(e) => setUsaBovedaForm(e.target.checked)} />
              Usa bóveda
            </label>
            {usaBovedaForm && (
              <CampoPrecio
                key={editando?.id ?? "nuevo"}
                name="valorBovedaCampo"
                required
                valorInicial={valorBovedaForm}
                placeholder="Precio de la bóveda"
              />
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <select aria-label="+ Agregar cofre del catálogo"
              defaultValue=""
              onChange={(e) => { if (e.target.value) agregarDesdeCofre(e.target.value); e.target.value = ""; }}
              className="rounded-lg border border-vino-100 px-3 py-2 text-sm"
            >
              <option value="">+ Agregar cofre del catálogo…</option>
              {cofres.map((c) => <option key={c.id} value={c.id}>{c.referencia} — {formatoPesos(c.precio)}</option>)}
            </select>
            <select aria-label="+ Agregar flores del catálogo"
              defaultValue=""
              onChange={(e) => { if (e.target.value) agregarDesdeFlor(e.target.value); e.target.value = ""; }}
              className="rounded-lg border border-vino-100 px-3 py-2 text-sm"
            >
              <option value="">+ Agregar flores del catálogo…</option>
              {flores.map((f) => <option key={f.id} value={f.id}>{f.nombre} — {formatoPesos(f.precioPublico)}</option>)}
            </select>
          </div>

          <select
            defaultValue=""
            onChange={(e) => { if (e.target.value) agregarDesdeTarifa(e.target.value as keyof TarifaConvenio); e.target.value = ""; }}
            disabled={!tarifaConvenio}
            className="w-full rounded-lg border border-vino-100 px-3 py-2 text-sm disabled:bg-vino-50 disabled:text-tinta/70"
          >
            <option value="">{tarifaConvenio ? "+ Agregar de la tarifa del convenio…" : "Elige un convenio arriba para ver su tarifa"}</option>
            {tarifaConvenio && OPCIONES_TARIFA.filter((o) => tarifaConvenio[o.campo] !== undefined).map((o) => (
              <option key={o.campo} value={o.campo}>{o.etiqueta} — {formatoPesos(tarifaConvenio[o.campo] as number)}</option>
            ))}
          </select>

          <div className="space-y-2">
            <p className="text-sm font-medium text-vino-900">Ítems del servicio</p>
            <p className="text-xs text-tinta/70">
              El precio de cofres/flores/tarifa se llena solo — edita "Valor unit." abajo si necesitas un valor distinto. La bóveda se agrega aparte, arriba.
            </p>
            {items.map((item, i) => (
              <div key={i} className="grid grid-cols-2 gap-2 rounded-lg border border-vino-50 p-2 sm:flex sm:items-center sm:border-0 sm:p-0">
                <input placeholder="Concepto" aria-label="Concepto" value={item.concepto} onChange={(e) => actualizarItem(i, "concepto", e.target.value)} className="col-span-2 w-full rounded-lg border border-vino-100 px-2 py-1.5 text-sm sm:col-span-1 sm:w-auto sm:flex-[2]" />
                <input type="number" min={1} placeholder="Cant." aria-label="Cant" value={item.cantidad} onChange={(e) => actualizarItem(i, "cantidad", e.target.value)} className="w-full rounded-lg border border-vino-100 px-2 py-1.5 text-sm sm:w-20" />
                <input type="number" min={0} placeholder="Valor unit." aria-label="Valor unit" value={item.valorUnitario || ""} onChange={(e) => actualizarItem(i, "valorUnitario", e.target.value)} className="w-full rounded-lg border border-vino-100 px-2 py-1.5 text-sm sm:w-28" />
                <button type="button" onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))} className="col-span-2 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs text-red-600 hover:bg-red-50 sm:col-span-1 sm:w-8 sm:py-0 sm:text-transparent">
                  <Trash2 size={16} className="shrink-0" /> <span className="sm:hidden">Quitar</span>
                </button>
              </div>
            ))}
            <button type="button" onClick={() => setItems((prev) => [...prev, itemVacio()])} className="flex items-center gap-1.5 text-sm text-vino-700 hover:underline">
              <Plus size={14} /> Agregar ítem manual
            </button>
            <p className="text-right text-sm font-medium text-vino-900">Total: {formatoPesos(totalServicio)}</p>
          </div>

          {editando && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-vino-900">Documentos (certificado de defunción, cédulas, etc.)</p>
              <SubirDocumento carpeta={`servicios/${editando.sede}/${editando.id}`} documentos={documentos} onCambiar={setDocumentos} />
            </div>
          )}
          {!editando && (
            <p className="text-xs text-tinta/70">Los documentos se adjuntan después de guardar — usa "Editar" en la lista para subirlos.</p>
          )}

          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={guardando} className="rounded-lg bg-vino-700 px-4 py-2 text-sm font-medium text-white hover:bg-vino-600 disabled:opacity-60">
              {guardando ? "Guardando…" : editando ? "Guardar cambios" : "Guardar servicio"}
            </button>
            <button type="button" onClick={() => { setMostrarFormulario(false); setEditando(null); setError(null); }} className="rounded-lg border border-vino-100 px-4 py-2 text-sm text-tinta/70">
              Cancelar
            </button>
          </div>
        </form>
        </Modal>
      )}

      {servicioEnfocado && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-vino-100 bg-vino-50/60 px-4 py-2.5 text-sm text-vino-900">
          <span>
            Mostrando solo el servicio <span className="font-mono text-xs">{servicioEnfocado.slice(0, 8)}…</span> (el de la bóveda).
            {!cargando && !servicios.some((s) => s.id === servicioEnfocado) && " No se encontró: puede que haya sido eliminado o que sea de otra sede (revisa el filtro de sede)."}
          </span>
          <button onClick={() => setSearchParams({})} className="font-medium text-vino-700 hover:underline">
            Ver todos los servicios
          </button>
        </div>
      )}

      <AvisoCarga carga={carga} />
      <DataTable
        columnas={[
          {
            encabezado: "Servicio",
            orden: (s: Servicio) => s.fallecido.nombreCompleto,
            render: (s: Servicio) => (
              <div className="min-w-[12rem] max-w-[18rem]">
                <p className="font-semibold text-tinta">{s.fallecido.nombreCompleto}</p>
                <p className="text-xs text-tinta/60">{formatoFecha(s.fechaServicio)} · {s.sede}</p>
              </div>
            ),
          },
          {
            encabezado: "Convenio",
            orden: (s: Servicio) => convenios.find((c) => c.id === s.convenioId)?.nombre,
            render: (s: Servicio) => (
              <div>
                <p className="text-tinta">{convenios.find((c) => c.id === s.convenioId)?.nombre ?? "Sin convenio"}</p>
                <p className="text-xs capitalize text-tinta/60">{s.tipoServicio}</p>
              </div>
            ),
          },
          {
            encabezado: "Valor",
            orden: (s: Servicio) => s.valorTotal,
            render: (s: Servicio) => <span className="whitespace-nowrap font-semibold tabular-nums text-tinta">{formatoPesos(s.valorTotal)}</span>,
          },
          {
            encabezado: "Facturación",
            orden: (s: Servicio) => s.estadoFacturacion,
            render: (s: Servicio) => (
              <Link to="/facturacion" title="Ir a Facturación" className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium hover:underline ${ESTILO_FACTURACION[s.estadoFacturacion]?.chip ?? ""}`}>
                <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${ESTILO_FACTURACION[s.estadoFacturacion]?.punto ?? ""}`} />
                {s.estadoFacturacion === "facturado" ? "pendiente de pago" : s.estadoFacturacion}
              </Link>
            ),
          },
          {
            encabezado: "Documentos",
            render: (s: Servicio) =>
              s.documentosAdjuntos?.length ? (
                <button
                  type="button"
                  onClick={() => setDocumentosDe(s)}
                  className="inline-flex items-center gap-1 rounded-full bg-vino-50 px-2.5 py-1 text-xs font-medium text-vino-700 hover:bg-vino-100"
                  title="Ver todos los documentos"
                >
                  <Paperclip size={12} aria-hidden="true" /> {s.documentosAdjuntos.length}
                </button>
              ) : (
                <span className="text-xs text-tinta/40">—</span>
              ),
          },
          {
            encabezado: "Acciones",
            render: (s: Servicio) => (
              <div className="flex items-center gap-0.5">
                <button aria-label="Editar" title="Editar" onClick={() => abrirParaEditar(s)} className="rounded-lg p-1.5 text-vino-700 hover:bg-vino-50"><Pencil size={16} aria-hidden="true" /></button>
                <button aria-label="Copiar ID del servicio" title="Copiar ID (para registrar la bóveda)" onClick={() => copiarId(s.id)} className="rounded-lg p-1.5 text-vino-700 hover:bg-vino-50">
                  {idCopiado === s.id ? <Check size={16} className="text-green-600" aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
                </button>
                {rol === "admin" && (
                  <button aria-label="Eliminar" title="Eliminar" onClick={() => manejarEliminar(s)} className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"><Trash2 size={16} aria-hidden="true" /></button>
                )}
              </div>
            ),
          },
        ]}
        filas={servicioEnfocado ? servicios.filter((s) => s.id === servicioEnfocado) : filtradosResumen}
        cargando={cargando}
        claveFila={(s) => s.id}
        vacioTitulo="Todavía no hay servicios registrados"
        vacioDescripcion='Usa "Nuevo servicio" para agregar el primero.'
      />

      {documentosDe && (
        <Modal titulo={`Documentos de ${documentosDe.fallecido.nombreCompleto}`} onCerrar={() => setDocumentosDe(null)} ancho="max-w-2xl">
          <ul className="grid gap-3 sm:grid-cols-2">
            {documentosDe.documentosAdjuntos.map((url, i) => (
              <li key={url}>
                <a href={url} target="_blank" rel="noreferrer" className="group block overflow-hidden rounded-xl border border-vino-100 bg-white transition hover:shadow-md">
                  {esImagen(url) ? (
                    <img src={url} alt={`Documento ${i + 1}`} className="aspect-[4/3] w-full bg-crema object-cover" />
                  ) : (
                    <div className="flex aspect-[4/3] w-full items-center justify-center bg-crema text-vino-400">
                      <FileText size={40} aria-hidden="true" />
                    </div>
                  )}
                  <p className="flex items-center justify-between gap-2 px-3 py-2 text-sm font-medium text-vino-700">
                    Documento {i + 1}
                    <span className="text-xs text-tinta/60 group-hover:underline">Abrir en otra pestaña</span>
                  </p>
                </a>
              </li>
            ))}
          </ul>
        </Modal>
      )}
    </div>
  );
}