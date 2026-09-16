import { useEffect, useState, FormEvent } from "react";
import { collection, onSnapshot, orderBy, query, where, Timestamp } from "firebase/firestore";
import { Plus, Trash2, ClipboardList, Copy, Check, Pencil } from "lucide-react";
import { db, registrarServicio, actualizarServicio } from "../api/client";
import DataTable from "../components/DataTable";
import SubirDocumento from "../components/SubirDocumento";
import { useRol } from "../auth/RolContext";
import type { Servicio, ItemServicio, TipoServicio, TipoTraslado, Convenio, TipoCofre, Flor, TarifaConvenio } from "../types";
import { formatoPesos, formatoTamano } from "../utils/formato";

import { Link } from "react-router-dom"; 

const SEDES = ["Pailitas", "Tamalameque", "Pelaya", "Curumaní"] as const;

function itemVacio(): ItemServicio {
  return { concepto: "", cantidad: 1, valorUnitario: 0, valorTotal: 0 };
}

function aFecha(valor: unknown): string {
  if (valor instanceof Timestamp) return valor.toDate().toLocaleDateString("es-CO");
  return "—";
}

function aInputDate(valor: unknown): string {
  if (valor instanceof Timestamp) return valor.toDate().toISOString().slice(0, 10);
  return "";
}

export default function Servicios() {
  const { rol, sedeAsignada, sedeSeleccionada, cargando: cargandoRol } = useRol();
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [cofres, setCofres] = useState<TipoCofre[]>([]);
  const [flores, setFlores] = useState<Flor[]>([]);
  const [idCopiado, setIdCopiado] = useState<string | null>(null);

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editando, setEditando] = useState<Servicio | null>(null);
  const [items, setItems] = useState<ItemServicio[]>([itemVacio()]);
  const [documentos, setDocumentos] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [convenioIdForm, setConvenioIdForm] = useState<string>("");
const [tarifaConvenio, setTarifaConvenio] = useState<TarifaConvenio | null>(null);
const OPCIONES_TARIFA: { campo: keyof TarifaConvenio; etiqueta: string }[] = [
  { campo: "servicioCompletoBasico", etiqueta: "Servicio completo básico" },
  { campo: "servicioCompletoSemilujo", etiqueta: "Servicio completo semilujo" },
  { campo: "servicioCompletoLujo", etiqueta: "Servicio completo lujo" },
  { campo: "iniciales", etiqueta: "Iniciales" },
  { campo: "finales", etiqueta: "Finales" },
  { campo: "trasladoLocal", etiqueta: "Traslado local" },
  { campo: "trasladoFluvial", etiqueta: "Traslado fluvial" },
];

  useEffect(() => {
    if (cargandoRol) return;
    const base = collection(db, "servicios");
    const q = sedeSeleccionada === "all"
      ? query(base, orderBy("fechaServicio", "desc"))
      : query(base, where("sede", "==", sedeSeleccionada), orderBy("fechaServicio", "desc"));
    return onSnapshot(
      q,
      (snap) => { setServicios(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Servicio))); setCargando(false); },
      (err) => console.error("Error en la consulta:", err)
    );
  }, [sedeSeleccionada, cargandoRol]);

  useEffect(() => onSnapshot(query(collection(db, "convenios")), (s) => setConvenios(s.docs.map((d) => ({ id: d.id, ...d.data() } as Convenio)))), []);
  useEffect(() => onSnapshot(query(collection(db, "tipos_cofre")), (s) => setCofres(s.docs.map((d) => ({ id: d.id, ...d.data() } as TipoCofre)))), []);
  useEffect(() => onSnapshot(query(collection(db, "flores")), (s) => setFlores(s.docs.map((d) => ({ id: d.id, ...d.data() } as Flor)))), []);
useEffect(() => {
  if (!convenioIdForm) { setTarifaConvenio(null); return; }
  return onSnapshot(
    query(collection(db, "convenios", convenioIdForm, "tarifas"), orderBy("anio", "desc")),
    (snap) => setTarifaConvenio(snap.empty ? null : (snap.docs[0].data() as TarifaConvenio)),
    (err) => console.error("Error cargando tarifa del convenio:", err)
  );
}, [convenioIdForm]);

  if (cargandoRol) return <div className="py-16 text-center text-tinta/50">Cargando…</div>;

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
    setItems((prev) => [...prev, { concepto: `Cofre ${cofre.referencia} (${cofre.nivel})`, cantidad: 1, valorUnitario: cofre.precio, valorTotal: cofre.precio }]);
  }

  function agregarDesdeFlor(florId: string) {
    const flor = flores.find((f) => f.id === florId);
    if (!flor) return;
    setItems((prev) => [...prev, { concepto: `Flores: ${flor.nombre}`, cantidad: 1, valorUnitario: flor.precioPublico, valorTotal: flor.precioPublico }]);
  }

  const totalServicio = items.reduce((s, it) => s + it.valorTotal, 0);

function abrirParaCrear() {
  setEditando(null);
  setItems([itemVacio()]);
  setDocumentos([]);
  setConvenioIdForm("");
  setMostrarFormulario(true);
}

function abrirParaEditar(servicio: Servicio) {
  setEditando(servicio);
  setItems(servicio.itemsServicio.length ? servicio.itemsServicio : [itemVacio()]);
  setDocumentos(servicio.documentosAdjuntos ?? []);
  setConvenioIdForm(servicio.convenioId ?? "");
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
          fallecido: { nombreCompleto: String(form.get("fallecidoNombre")), cedula: String(form.get("fallecidoCedula") || "") || undefined },
          tipoServicio: String(form.get("tipoServicio")) as TipoServicio,
          tipoTraslado: String(form.get("tipoTraslado")) as TipoTraslado,
          usaBoveda: form.get("usaBoveda") === "on",
          tuvoMisaOCulto: String(form.get("tuvoMisaOCulto")) as "misa" | "culto" | "ninguno",
          itemsServicio: itemsValidos,
          documentosAdjuntos: documentos,
        });
      } else {
        await registrarServicio({
          fechaServicio: String(form.get("fechaServicio")),
          sede: (rol === "admin" ? String(form.get("sede")) : sedeAsignada) as Servicio["sede"],
          convenioId: String(form.get("convenioId")),
          fallecido: { nombreCompleto: String(form.get("fallecidoNombre")), cedula: String(form.get("fallecidoCedula") || "") || undefined },
          tipoServicio: String(form.get("tipoServicio")) as TipoServicio,
          tipoTraslado: String(form.get("tipoTraslado")) as TipoTraslado,
          usaBoveda: form.get("usaBoveda") === "on",
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
function agregarDesdeTarifa(campo: keyof TarifaConvenio) {
  if (!tarifaConvenio) return;
  const valor = tarifaConvenio[campo] as number | undefined;
  if (!valor) return;
  const etiqueta = OPCIONES_TARIFA.find((o) => o.campo === campo)?.etiqueta ?? String(campo);
  setItems((prev) => [...prev, { concepto: etiqueta, cantidad: 1, valorUnitario: valor, valorTotal: valor }]);
}
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg text-vino-900">Servicios</h2>
        <button onClick={abrirParaCrear} className="flex items-center gap-2 rounded-lg bg-buganvilla px-4 py-2.5 text-sm font-medium text-white hover:opacity-90">
          <ClipboardList size={16} /> Nuevo servicio
        </button>
      </div>

      {mostrarFormulario && (
        <form onSubmit={manejarGuardar} className="space-y-4 rounded-xl border border-vino-100 bg-white p-4">
          <p className="text-sm font-medium text-vino-900">
            {editando ? `Editando servicio de ${editando.fallecido.nombreCompleto}` : "Nuevo servicio"}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <input name="fechaServicio" type="date" required defaultValue={editando ? aInputDate(editando.fechaServicio) : undefined} className="rounded-lg border border-vino-100 px-3 py-2 text-sm" />
            {!editando && (
              rol === "admin" ? (
                <select name="sede" required className="rounded-lg border border-vino-100 px-3 py-2 text-sm">
                  <option value="">Sede…</option>
                  {SEDES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              ) : (
                <input type="hidden" name="sede" value={sedeAsignada ?? ""} />
              )
            )}
            <input name="fallecidoNombre" required defaultValue={editando?.fallecido.nombreCompleto} placeholder="Nombre del fallecido" className="rounded-lg border border-vino-100 px-3 py-2 text-sm" />
            <input name="fallecidoCedula" required defaultValue={editando?.fallecido.cedula} placeholder="Cédula del fallecido" className="rounded-lg border border-vino-100 px-3 py-2 text-sm" />
            <select name="convenioId" defaultValue={editando?.convenioId} onChange={(e) => setConvenioIdForm(e.target.value)} className="rounded-lg border border-vino-100 px-3 py-2 text-sm">
              <option value="">Sin convenio (afiliado/particular)</option>
              {convenios.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} ({c.tipo === "interno" ? "afiliado/particular" : c.tipo === "alcaldia" ? "alcaldía" : "empresa"})
                </option>
              ))}
            </select>
            <select name="tipoServicio" required defaultValue={editando?.tipoServicio} className="rounded-lg border border-vino-100 px-3 py-2 text-sm">
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
              <input type="checkbox" name="usaBoveda" defaultChecked={editando?.usoBoveda.usada} />
              Usa bóveda
            </label>
          </div>
          <select
  defaultValue=""
  onChange={(e) => { if (e.target.value) agregarDesdeTarifa(e.target.value as keyof TarifaConvenio); e.target.value = ""; }}
  disabled={!tarifaConvenio}
  className="w-full rounded-lg border border-vino-100 px-3 py-2 text-sm disabled:bg-vino-50 disabled:text-tinta/40"
>
  <option value="">{tarifaConvenio ? "+ Agregar de la tarifa del convenio…" : "Elige un convenio arriba para ver su tarifa"}</option>
  {tarifaConvenio && OPCIONES_TARIFA.filter((o) => tarifaConvenio[o.campo] !== undefined).map((o) => (
    <option key={o.campo} value={o.campo}>{o.etiqueta} — {formatoPesos(tarifaConvenio[o.campo] as number)}</option>
  ))}
</select>

          {/* Agregar rápido desde catálogo — el precio se autocompleta; para cambiarlo, edita el valor unitario abajo */}
          <div className="grid gap-3 sm:grid-cols-2">
            <select
              defaultValue=""
              onChange={(e) => { if (e.target.value) agregarDesdeCofre(e.target.value); e.target.value = ""; }}
              className="rounded-lg border border-vino-100 px-3 py-2 text-sm"
            >
              <option value="">+ Agregar cofre del catálogo…</option>
              {cofres.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.referencia} ({c.categoria === "infantil" ? formatoTamano(c.tamanoCm) : c.categoria === "ancho" ? "ancho" : c.nivel}) — {formatoPesos(c.precio)}
                </option>
              ))}
            </select>
            <select
              defaultValue=""
              onChange={(e) => { if (e.target.value) agregarDesdeFlor(e.target.value); e.target.value = ""; }}
              className="rounded-lg border border-vino-100 px-3 py-2 text-sm"
            >
              <option value="">+ Agregar flores del catálogo…</option>
              {flores.map((f) => <option key={f.id} value={f.id}>{f.nombre} — ${f.precioPublico.toLocaleString("es-CO")}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-vino-900">Ítems del servicio</p>
            <p className="text-xs text-tinta/50">
              El precio de cofres/flores se llena solo — edita "Valor unit." abajo si necesitas un valor distinto (ej. un cofre de lujo con precio especial).
            </p>
            {items.map((item, i) => (
              <div key={i} className="grid grid-cols-[1fr_5rem_7rem_2rem] gap-2">
                <input placeholder="Concepto" value={item.concepto} onChange={(e) => actualizarItem(i, "concepto", e.target.value)} className="rounded-lg border border-vino-100 px-2 py-1.5 text-sm" />
                <input type="number" min={1} placeholder="Cant." value={item.cantidad} onChange={(e) => actualizarItem(i, "cantidad", e.target.value)} className="rounded-lg border border-vino-100 px-2 py-1.5 text-sm" />
                <input type="number" min={0} placeholder="Valor unit." value={item.valorUnitario} onChange={(e) => actualizarItem(i, "valorUnitario", e.target.value)} className="rounded-lg border border-vino-100 px-2 py-1.5 text-sm" />
                <button type="button" onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))} className="text-tinta/40 hover:text-red-600">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => setItems((prev) => [...prev, itemVacio()])} className="flex items-center gap-1.5 text-sm text-vino-700 hover:underline">
              <Plus size={14} /> Agregar ítem manual
            </button>
            <p className="text-right text-sm font-medium text-vino-900">{formatoPesos(totalServicio)}</p>
          </div>

          {editando && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-vino-900">Documentos (certificado de defunción, cédulas, etc.)</p>
              <SubirDocumento carpeta={`servicios/${editando.sede}/${editando.id}`} documentos={documentos} onCambiar={setDocumentos} />
            </div>
          )}
          {!editando && (
            <p className="text-xs text-tinta/50">
              Los documentos se adjuntan después de guardar — usa "Editar" en la lista para subirlos.
            </p>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={guardando} className="rounded-lg bg-vino-700 px-4 py-2 text-sm font-medium text-white hover:bg-vino-600 disabled:opacity-60">
              {guardando ? "Guardando…" : editando ? "Guardar cambios" : "Guardar servicio"}
            </button>
            {editando && (
              <button type="button" onClick={() => { setMostrarFormulario(false); setEditando(null); }} className="rounded-lg border border-vino-100 px-4 py-2 text-sm text-tinta/60">
                Cancelar
              </button>
            )}
          </div>
        </form>
      )}

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
          { encabezado: "Fecha", render: (s: Servicio) => aFecha(s.fechaServicio) },
          { encabezado: "Fallecido", render: (s: Servicio) => s.fallecido.nombreCompleto },
          { encabezado: "Convenio", render: (s: Servicio) => convenios.find((c) => c.id === s.convenioId)?.nombre ?? s.convenioId },
          { encabezado: "Valor", render: (s: Servicio) => formatoPesos(s.valorTotal) },
          {
  encabezado: "Facturación",
  render: (s: Servicio) => (
    <Link to="/facturacion" className={`rounded-full px-2.5 py-1 text-xs hover:underline ${
      s.estadoFacturacion === "pagado" ? "bg-green-50 text-green-700"
      : s.estadoFacturacion === "facturado" ? "bg-blue-50 text-blue-700"
      : "bg-amber-50 text-amber-700"
    }`}>
      {s.estadoFacturacion}
    </Link>
  ),
},
          {
            encabezado: "Editar",
            render: (s: Servicio) => (
              <button onClick={() => abrirParaEditar(s)} className="text-vino-700 hover:underline">
                <Pencil size={14} />
              </button>
            ),
          },
          {
            encabezado: "Documentos",
            render: (s: Servicio) =>
              s.documentosAdjuntos?.length ? (
                <a href={s.documentosAdjuntos[0]} target="_blank" rel="noreferrer" className="text-vino-700 hover:underline">
                  Ver ({s.documentosAdjuntos.length})
                </a>
              ) : (
                <span className="text-xs text-tinta/40">—</span>
              ),
          },
        ]}
        filas={servicios}
        cargando={cargando}
        claveFila={(s) => s.id}
        vacioTitulo="Todavía no hay servicios registrados"
        vacioDescripcion='Usa "Nuevo servicio" para agregar el primero.'
      />
    </div>
  );
}