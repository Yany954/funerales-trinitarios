import { useEffect, useState, FormEvent } from "react";
import { useEstadoCarga, AvisoCarga } from "../hooks/useEstadoCarga";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { Landmark, Trash2, ExternalLink, Copy, Check, Plus, BookOpen, Pencil, CalendarClock, MapPin } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { db, registrarBoveda, eliminarBoveda, crearItemBoveda, actualizarItemBoveda, eliminarItemBoveda } from "../api/client";
import { formatoFecha, formatoPesos } from "../utils/formato";
import { useRol } from "../auth/RolContext";
import CampoPrecio from "../components/CampoPrecio";
import Modal, { PieFormulario } from "../components/Modal";
import { confirmarAccion, confirmarEliminar } from "../utils/confirmar";
import { UBICACIONES_POR_SEDE } from "../types";
import type { Boveda, EstadoBoveda, ItemBoveda, Sede, Servicio } from "../types";

const SEDES: Sede[] = ["Pailitas", "Tamalameque", "Pelaya", "Curumaní"];

const ESTADOS: { valor: EstadoBoveda; titulo: string; texto: string; borde: string; barra: string; chip: string }[] = [
  { valor: "vigente", titulo: "Vigentes", texto: "text-green-700", borde: "border-l-green-600", barra: "bg-green-600", chip: "bg-green-50 text-green-700" },
  { valor: "por vencer", titulo: "Por vencer", texto: "text-amber-700", borde: "border-l-amber-500", barra: "bg-amber-500", chip: "bg-amber-50 text-amber-800" },
  { valor: "vencida", titulo: "Vencidas", texto: "text-red-700", borde: "border-l-red-600", barra: "bg-red-600", chip: "bg-red-50 text-red-700" },
];
const ESTILO = Object.fromEntries(ESTADOS.map((e) => [e.valor, e])) as Record<EstadoBoveda, (typeof ESTADOS)[number]>;

/** Timestamp / "aaaa-mm-dd" → milisegundos de esa fecha a medianoche UTC. */
function aMs(valor: unknown): number | null {
  const conToDate = valor as { toDate?: () => Date };
  const fecha = conToDate?.toDate ? conToDate.toDate() : new Date(valor as string);
  return isNaN(fecha.getTime()) ? null : Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate());
}

/** "Vence en 23 días" / "Vence hoy" / "Venció hace 5 días". */
function textoDias(fechaLimite: unknown): string {
  const limite = aMs(fechaLimite);
  if (limite === null) return "";
  const hoy = new Date();
  const dias = Math.round((limite - Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate())) / 86400000);
  if (dias === 0) return "Vence hoy";
  if (dias > 0) return `Vence en ${dias} ${dias === 1 ? "día" : "días"}`;
  return `Venció hace ${-dias} ${dias === -1 ? "día" : "días"}`;
}

export default function Bovedas() {
  const { rol, sedeAsignada, sedeSeleccionada, cargando: cargandoRol } = useRol();
  const [bovedas, setBovedas] = useState<Boveda[]>([]);
  const carga = useEstadoCarga();
  const { cargando } = carga;
  const [searchParams] = useSearchParams();
  const estadoInicial = (searchParams.get("estado") as EstadoBoveda | null) ?? "todas";
  const [filtro, setFiltro] = useState<EstadoBoveda | "todas">(estadoInicial);
  const [registrando, setRegistrando] = useState(false);
  const [viendoCatalogo, setViendoCatalogo] = useState(false);
  const [idCopiado, setIdCopiado] = useState<string | null>(null);
  // id del servicio → nombre del fallecido.
  const [fallecidoPorServicio, setFallecidoPorServicio] = useState<Record<string, string>>({});
  const [itemsBoveda, setItemsBoveda] = useState<ItemBoveda[]>([]);

  useEffect(() => {
    return onSnapshot(
      query(collection(db, "items_boveda")),
      (snap) => setItemsBoveda(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ItemBoveda))),
      (err) => console.error("Error cargando el catálogo de bóvedas:", err)
    );
  }, []);

  useEffect(() => {
    if (cargandoRol) return;
    const base = collection(db, "bovedas");
    const q = sedeSeleccionada === "all"
      ? query(base, orderBy("fechaLimite"))
      : query(base, where("sede", "==", sedeSeleccionada), orderBy("fechaLimite"));
    return onSnapshot(
      q,
      (snap) => { setBovedas(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Boveda))); carga.listo(); },
      (err) => carga.fallo(err)
    );
  }, [sedeSeleccionada, cargandoRol, carga.intento]);

  useEffect(() => {
    if (cargandoRol) return;
    const base = collection(db, "servicios");
    const q = sedeSeleccionada === "all" ? query(base) : query(base, where("sede", "==", sedeSeleccionada));
    return onSnapshot(
      q,
      (snap) => {
        const mapa: Record<string, string> = {};
        snap.docs.forEach((d) => (mapa[d.id] = (d.data() as Servicio).fallecido?.nombreCompleto ?? ""));
        setFallecidoPorServicio(mapa);
      },
      (err) => console.error("Error cargando servicios:", err)
    );
  }, [sedeSeleccionada, cargandoRol]);

  if (cargandoRol) return <div className="py-16 text-center text-tinta/70">Cargando…</div>;

  const nombreFallecido = (b: Boveda) => (b.servicioId && fallecidoPorServicio[b.servicioId]) || "";

  async function manejarEliminarBoveda(b: Boveda) {
    const nombre = nombreFallecido(b) ? `la bóveda de ${nombreFallecido(b)}` : `la bóveda de ${b.zona}`;
    const ok = await confirmarAccion("¿Eliminar la bóveda?", `Se va a borrar ${nombre}. Esta acción no se puede deshacer.`, "Sí, eliminar");
    if (!ok) return;
    try {
      await eliminarBoveda(b.id);
    } catch (err) {
      console.error("Error eliminando bóveda:", err);
    }
  }

  function copiarId(id: string) {
    navigator.clipboard.writeText(id);
    setIdCopiado(id);
    setTimeout(() => setIdCopiado(null), 1500);
  }

  const conteo: Record<EstadoBoveda, number> = {
    vigente: bovedas.filter((b) => b.estado === "vigente").length,
    "por vencer": bovedas.filter((b) => b.estado === "por vencer").length,
    vencida: bovedas.filter((b) => b.estado === "vencida").length,
  };
  const filtradas = filtro === "todas" ? bovedas : bovedas.filter((b) => b.estado === filtro);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h2 className="font-display text-2xl text-vino-900">Bóvedas</h2>
          <p className="mt-1 text-sm text-tinta/70">
            Cada bóveda se arrienda por 4 años. Aquí ves cuáles están vigentes, cuáles se vencen pronto y cuáles ya vencieron.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setViendoCatalogo(true)}
            className="flex min-h-[44px] items-center gap-2 rounded-lg border border-vino-100 bg-white px-4 text-sm font-medium text-vino-700 transition hover:bg-vino-50"
          >
            <BookOpen size={16} aria-hidden="true" /> Catálogo de precios ({itemsBoveda.length})
          </button>
          <button
            onClick={() => setRegistrando(true)}
            className="flex min-h-[44px] items-center gap-2 rounded-lg bg-vino-700 px-4 text-sm font-medium text-white transition hover:bg-vino-600 active:translate-y-px"
          >
            <Plus size={16} aria-hidden="true" /> Registrar bóveda
          </button>
        </div>
      </header>

      <AvisoCarga carga={carga} />

      {/* Resumen: cada cifra es también un filtro */}
      <section aria-label="Resumen por estado" className="space-y-4 rounded-2xl border border-vino-100 bg-white p-5">
        <div className="grid gap-3 sm:grid-cols-3">
          {ESTADOS.map((e) => {
            const activo = filtro === e.valor;
            return (
              <button
                key={e.valor}
                onClick={() => setFiltro(activo ? "todas" : e.valor)}
                aria-pressed={activo}
                className={`rounded-xl border p-4 text-left transition hover:shadow-md ${activo ? "border-vino-600 ring-2 ring-vino-100" : "border-vino-100"}`}
              >
                <p className="text-sm text-tinta/70">{e.titulo}</p>
                <p className={`mt-1 font-display text-3xl tabular-nums ${e.texto}`}>{conteo[e.valor]}</p>
              </button>
            );
          })}
        </div>
        {bovedas.length > 0 && (
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-vino-50" role="img" aria-label={`${conteo.vigente} vigentes, ${conteo["por vencer"]} por vencer, ${conteo.vencida} vencidas`}>
            {ESTADOS.map((e) => (
              <div key={e.valor} className={e.barra} style={{ width: `${(conteo[e.valor] / bovedas.length) * 100}%` }} />
            ))}
          </div>
        )}
        <p className="text-xs text-tinta/70">
          {filtro === "todas" ? `Mostrando las ${bovedas.length} bóvedas.` : `Mostrando solo "${ESTILO[filtro].titulo.toLowerCase()}". Toca la cifra otra vez para ver todas.`}
        </p>
      </section>

      {/* Lista: la que vence primero, arriba */}
      <section aria-label="Bóvedas" className="space-y-3">
        {filtradas.map((b) => {
          const estilo = ESTILO[b.estado];
          return (
            <article key={b.id} className={`flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-l-4 border-vino-100 bg-white p-4 ${estilo?.borde ?? ""}`}>
              <div className="min-w-[12rem] flex-1">
                <p className="font-display text-lg text-vino-900">{nombreFallecido(b) || "Sin fallecido asociado"}</p>
                <p className="flex items-center gap-1 text-sm text-tinta/70">
                  <MapPin size={13} aria-hidden="true" /> {[b.zona, b.sede].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="min-w-[10rem]">
                <p className="flex items-center gap-1 text-sm text-tinta">
                  <CalendarClock size={13} aria-hidden="true" /> Vence el {formatoFecha(b.fechaLimite)}
                </p>
                <p className={`text-xs font-medium ${estilo?.texto ?? ""}`}>{textoDias(b.fechaLimite)}</p>
                <p className="text-xs text-tinta/70">Desde {formatoFecha(b.fechaInicio)}</p>
              </div>
              <div className="min-w-[7rem]">
                <p className="font-semibold tabular-nums text-tinta">{formatoPesos(b.valorArriendo)}</p>
                {b.incluyeExhumacion && <p className="text-xs text-tinta/70">Incluye exhumación</p>}
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${estilo?.chip ?? ""}`}>{b.estado}</span>
              <div className="flex items-center gap-2">
                {b.servicioId ? (
                  <>
                    <Link
                      to={`/servicios?servicio=${encodeURIComponent(b.servicioId)}`}
                      className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-vino-700 hover:bg-vino-50"
                      title="Ver el servicio"
                    >
                      Ver servicio <ExternalLink size={12} aria-hidden="true" />
                    </Link>
                    <button onClick={() => copiarId(b.servicioId!)} className="rounded-lg p-1.5 text-tinta/70 hover:bg-vino-50 hover:text-vino-700" title="Copiar ID del servicio" aria-label="Copiar ID del servicio">
                      {idCopiado === b.servicioId ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                    </button>
                  </>
                ) : (
                  <span className="text-xs text-tinta/70">Sin servicio</span>
                )}
                <button aria-label="Eliminar bóveda" title="Eliminar bóveda" onClick={() => manejarEliminarBoveda(b)} className="rounded-lg p-1.5 text-red-600 hover:bg-red-50">
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </div>
            </article>
          );
        })}
        {cargando && <p className="text-sm text-tinta/70">Cargando…</p>}
        {!cargando && filtradas.length === 0 && (
          <div className="rounded-2xl border border-dashed border-vino-400 bg-white p-8 text-center">
            <Landmark size={28} aria-hidden="true" className="mx-auto text-vino-400" />
            <p className="mt-2 font-display text-lg text-vino-900">No hay bóvedas en esta categoría</p>
            <p className="text-sm text-tinta/70">Usa "Registrar bóveda" para agregar la primera.</p>
          </div>
        )}
      </section>

      {registrando && (
        <ModalRegistrarBoveda
          esAdmin={rol === "admin"}
          sedeAsignada={sedeAsignada as Sede | null}
          itemsBoveda={itemsBoveda}
          onCerrar={() => setRegistrando(false)}
        />
      )}
      {viendoCatalogo && <ModalCatalogo items={itemsBoveda} onCerrar={() => setViendoCatalogo(false)} />}
    </div>
  );
}

/** Mismo formulario y misma llamada (registrarBoveda) de antes, en una ventana emergente. */
function ModalRegistrarBoveda({
  esAdmin,
  sedeAsignada,
  itemsBoveda,
  onCerrar,
}: {
  esAdmin: boolean;
  sedeAsignada: Sede | null;
  itemsBoveda: ItemBoveda[];
  onCerrar: () => void;
}) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [itemSeleccionado, setItemSeleccionado] = useState("");
  const [usarValorManual, setUsarValorManual] = useState(false);
  const [municipioForm, setMunicipioForm] = useState("Pailitas");

  async function manejarCrear(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    const form = new FormData(e.currentTarget);
    try {
      await registrarBoveda({
        sede: (esAdmin ? String(form.get("sede")) : sedeAsignada) as Sede,
        servicioId: String(form.get("servicioId") || "") || undefined,
        zona: String(form.get("zona") || ""),
        itemBovedaId: usarValorManual ? undefined : itemSeleccionado || undefined,
        valorArriendo: usarValorManual ? Number(form.get("valorArriendoManual")) : undefined,
        fechaInicio: String(form.get("fechaInicio")),
        incluyeExhumacion: form.get("incluyeExhumacion") === "on",
      });
      onCerrar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar la bóveda.");
    } finally {
      setGuardando(false);
    }
  }

  const clase = "w-full rounded-lg border border-vino-100 px-3 py-2 text-sm";
  return (
    <Modal titulo="Registrar bóveda" onCerrar={onCerrar} ancho="max-w-lg">
      <form onSubmit={manejarCrear} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {esAdmin ? (
            <div>
              <label htmlFor="bov-sede" className="mb-1 block text-sm font-medium">Sede</label>
              <select id="bov-sede" name="sede" required className={clase}>
                <option value="">Elige…</option>
                {SEDES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          ) : (
            <input type="hidden" name="sede" value={sedeAsignada ?? ""} />
          )}
          <div>
            <label htmlFor="bov-servicio" className="mb-1 block text-sm font-medium">ID del servicio (opcional)</label>
            <input id="bov-servicio" name="servicioId" placeholder="Pégalo desde Servicios" className={clase} />
          </div>
          <div>
            <label htmlFor="bov-municipio" className="mb-1 block text-sm font-medium">Municipio</label>
            <select id="bov-municipio" value={municipioForm} onChange={(e) => setMunicipioForm(e.target.value)} className={clase}>
              {Object.keys(UBICACIONES_POR_SEDE).map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="bov-zona" className="mb-1 block text-sm font-medium">Zona</label>
            <select id="bov-zona" name="zona" required className={clase}>
              {UBICACIONES_POR_SEDE[municipioForm].map((v) => <option key={v} value={`${municipioForm} - ${v}`}>{v}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="bov-item" className="mb-1 block text-sm font-medium">Precio del catálogo</label>
            <select id="bov-item" value={itemSeleccionado} onChange={(e) => setItemSeleccionado(e.target.value)} disabled={usarValorManual} className={`${clase} disabled:bg-vino-50`}>
              <option value="">Elige un ítem del catálogo…</option>
              {itemsBoveda.map((i) => <option key={i.id} value={i.id}>{i.nombre} — {formatoPesos(i.precio)}</option>)}
            </select>
            <label className="mt-2 flex items-center gap-2 text-sm text-tinta/70">
              <input type="checkbox" checked={usarValorManual} onChange={(e) => setUsarValorManual(e.target.checked)} />
              Ingresar valor manual (en vez del catálogo)
            </label>
          </div>
          {usarValorManual && (
            <div className="sm:col-span-2">
              <label htmlFor="bov-valor" className="mb-1 block text-sm font-medium">Valor de la bóveda</label>
              <CampoPrecio id="bov-valor" name="valorArriendoManual" placeholder="Ej. 800.000" />
            </div>
          )}
          <div>
            <label htmlFor="bov-inicio" className="mb-1 block text-sm font-medium">Fecha de inicio</label>
            <input id="bov-inicio" name="fechaInicio" type="date" min="1900-01-01" max="2100-12-31" required className={clase} />
          </div>
          <label className="flex items-center gap-2 self-end pb-2 text-sm text-tinta/70">
            <input type="checkbox" name="incluyeExhumacion" />
            Incluye exhumación
          </label>
        </div>
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <PieFormulario onCancelar={onCerrar} guardando={guardando} textoGuardar="Guardar bóveda" />
      </form>
    </Modal>
  );
}

/** Catálogo de precios de bóveda: mismas acciones de antes (crear, editar, eliminar). */
function ModalCatalogo({ items, onCerrar }: { items: ItemBoveda[]; onCerrar: () => void }) {
  const [editandoItem, setEditandoItem] = useState<ItemBoveda | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function manejarGuardarItem(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formulario = e.currentTarget;
    const form = new FormData(formulario);
    const datos = { nombre: String(form.get("nombre")), zona: String(form.get("zonaItem")), precio: Number(form.get("precioItem")) };
    setGuardando(true);
    try {
      if (editandoItem) {
        await actualizarItemBoveda({ id: editandoItem.id, ...datos });
      } else {
        await crearItemBoveda(datos);
      }
      setEditandoItem(null);
      formulario.reset();
    } finally {
      setGuardando(false);
    }
  }

  async function manejarEliminarItem(item: ItemBoveda) {
    const confirmado = await confirmarEliminar(item.nombre);
    if (!confirmado) return;
    await eliminarItemBoveda(item.id);
  }

  return (
    <Modal titulo="Catálogo de precios de bóveda" onCerrar={onCerrar} ancho="max-w-xl">
      <div className="space-y-5">
        <ul className="divide-y divide-vino-50 rounded-xl border border-vino-100">
          {items.length === 0 && <li className="p-4 text-sm text-tinta/70">Todavía no hay precios en el catálogo.</li>}
          {items.map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-tinta">{i.nombre}</p>
                <p className="text-xs text-tinta/70">{i.zona}</p>
              </div>
              <div className="flex items-center gap-1">
                <span className="mr-2 font-semibold tabular-nums">{formatoPesos(i.precio)}</span>
                <button onClick={() => setEditandoItem(i)} aria-label={`Editar ${i.nombre}`} className="rounded-lg p-2 text-vino-700 hover:bg-vino-50"><Pencil size={15} aria-hidden="true" /></button>
                <button onClick={() => manejarEliminarItem(i)} aria-label={`Eliminar ${i.nombre}`} className="rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 size={15} aria-hidden="true" /></button>
              </div>
            </li>
          ))}
        </ul>
        {/* key: al elegir otro ítem para editar, el formulario se vuelve a llenar con sus datos */}
        <form key={editandoItem?.id ?? "nuevo"} onSubmit={manejarGuardarItem} className="space-y-3 rounded-xl bg-crema p-4">
          <p className="text-sm font-medium text-vino-900">{editandoItem ? `Editando: ${editandoItem.nombre}` : "Agregar un precio"}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <input name="nombre" required defaultValue={editandoItem?.nombre} placeholder="Nombre (ej. Bóveda Pailitas-Pelaya)" aria-label="Nombre" className="rounded-lg border border-vino-100 bg-white px-3 py-2 text-sm sm:col-span-2" />
            <input name="zonaItem" required defaultValue={editandoItem?.zona} placeholder="Zona que cubre" aria-label="Zona que cubre" className="rounded-lg border border-vino-100 bg-white px-3 py-2 text-sm" />
            <CampoPrecio name="precioItem" required valorInicial={editandoItem?.precio} placeholder="Precio" />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={guardando} className="min-h-[40px] rounded-lg bg-vino-700 px-4 text-sm font-medium text-white hover:bg-vino-600 disabled:opacity-60">
              {guardando ? "Guardando…" : editandoItem ? "Guardar cambios" : "Agregar al catálogo"}
            </button>
            {editandoItem && (
              <button type="button" onClick={() => setEditandoItem(null)} className="min-h-[40px] rounded-lg border border-vino-100 bg-white px-4 text-sm text-tinta/70">
                Cancelar edición
              </button>
            )}
          </div>
        </form>
      </div>
    </Modal>
  );
}
