import { useEffect, useMemo, useState, FormEvent } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { Package, PackageX, AlertTriangle, Boxes, RefreshCw } from "lucide-react";
import { db, actualizarInventario } from "../api/client";
import { useRol } from "../auth/RolContext";
import { useEstadoCarga, AvisoCarga } from "../hooks/useEstadoCarga";
import Modal, { PieFormulario } from "../components/Modal";
import ImagenAmpliable from "../components/ImagenAmpliable";
import { formatoTamano } from "../utils/formato";
import { ESTILO_STOCK, POCAS_UNIDADES, nivelStock, stockPorCofre, type NivelStock } from "../utils/inventario";
import type { InventarioCofre, TipoCofre } from "../types";

const SEDES = ["Pailitas", "Tamalameque", "Pelaya", "Curumaní"] as const;
const ETIQUETA_NIVEL: Record<string, string> = { basico: "Básico", semilujo: "Semilujo", lujo: "Lujo" };

type Filtro = "todos" | Exclude<NivelStock, "ok">;

export default function Inventario() {
  const { rol, sedeAsignada, sedeSeleccionada, cargando: cargandoRol } = useRol();
  const sedeActiva = rol === "admin" ? sedeSeleccionada : sedeAsignada;

  const [cofres, setCofres] = useState<TipoCofre[]>([]);
  const [inventario, setInventario] = useState<InventarioCofre[]>([]);
  const carga = useEstadoCarga();
  const { cargando } = carga;
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [actualizando, setActualizando] = useState<TipoCofre | null>(null);

  useEffect(() => {
    return onSnapshot(
      query(collection(db, "tipos_cofre")),
      (snap) => setCofres(snap.docs.map((d) => ({ id: d.id, ...d.data() } as TipoCofre))),
      (err) => console.error("Error cargando tipos de cofre:", err)
    );
  }, []);

  useEffect(() => {
    if (cargandoRol || !sedeActiva) return;
    const base = collection(db, "inventario_cofres");
    const q = sedeActiva === "all" ? query(base) : query(base, where("sede", "==", sedeActiva));
    return onSnapshot(
      q,
      (snap) => {
        setInventario(snap.docs.map((d) => ({ id: d.id, ...d.data() } as InventarioCofre)));
        carga.listo();
      },
      (err) => carga.fallo(err)
    );
  }, [sedeActiva, cargandoRol, carga.intento]);

  const stock = useMemo(() => stockPorCofre(inventario), [inventario]);
  // Todos los cofres del catálogo: uno sin registro de inventario cuenta como agotado.
  const filas = useMemo(
    () =>
      cofres
        .map((c) => ({ cofre: c, total: stock[c.id]?.total ?? 0, porSede: stock[c.id]?.porSede ?? [] }))
        .sort((a, b) => a.total - b.total || a.cofre.referencia.localeCompare(b.cofre.referencia)),
    [cofres, stock]
  );
  const resumen = {
    total: filas.reduce((t, f) => t + f.total, 0),
    agotados: filas.filter((f) => nivelStock(f.total) === "agotado").length,
    pocas: filas.filter((f) => nivelStock(f.total) === "pocas").length,
  };
  const visibles = filtro === "todos" ? filas : filas.filter((f) => nivelStock(f.total) === filtro);

  if (cargandoRol) return <div className="py-16 text-center text-tinta/70">Cargando…</div>;

  const cifras: { clave: Filtro; titulo: string; valor: number; icono: typeof Boxes; clase: string }[] = [
    { clave: "todos", titulo: "Cofres disponibles", valor: resumen.total, icono: Boxes, clase: "text-vino-900" },
    { clave: "agotado", titulo: "Referencias agotadas", valor: resumen.agotados, icono: PackageX, clase: "text-red-700" },
    { clave: "pocas", titulo: `Con pocas unidades (≤ ${POCAS_UNIDADES})`, valor: resumen.pocas, icono: AlertTriangle, clase: "text-amber-700" },
  ];

  return (
    <div className="space-y-8">
      <header className="max-w-2xl">
        <h2 className="font-display text-2xl text-vino-900">Inventario de cofres</h2>
        <p className="mt-1 text-sm text-tinta/70">
          {sedeActiva === "all" ? "Resumen de todas las sedes." : `Sede ${sedeActiva}.`} Primero los que se están acabando. Toca una cifra para filtrar.
        </p>
      </header>

      <AvisoCarga carga={carga} />

      <section aria-label="Resumen" className="grid gap-3 sm:grid-cols-3">
        {cifras.map((c) => {
          const Icono = c.icono;
          const activo = filtro === c.clave;
          return (
            <button
              key={c.clave}
              onClick={() => setFiltro(activo && c.clave !== "todos" ? "todos" : c.clave)}
              aria-pressed={activo}
              className={`rounded-2xl border bg-white p-5 text-left transition hover:shadow-md ${activo ? "border-vino-600 ring-2 ring-vino-100" : "border-vino-100"}`}
            >
              <p className="flex items-center gap-2 text-sm text-tinta/70">
                <Icono size={16} aria-hidden="true" /> {c.titulo}
              </p>
              <p className={`mt-1 font-display text-3xl tabular-nums ${c.clase}`}>{c.valor}</p>
            </button>
          );
        })}
      </section>

      <section aria-label="Cofres" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visibles.map(({ cofre, total, porSede }) => {
          const estilo = ESTILO_STOCK[nivelStock(total)];
          return (
            <article key={cofre.id} className="flex gap-4 rounded-2xl border border-vino-100 bg-white p-4">
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-crema">
                {cofre.fotoURL ? (
                  <ImagenAmpliable src={cofre.fotoURL} alt={cofre.referencia} bloque className="h-24 w-24 object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-vino-400"><Package size={28} aria-hidden="true" /></div>
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <h3 className="truncate font-display text-lg text-vino-900">{cofre.referencia}</h3>
                <p className="text-xs text-tinta/70">
                  {cofre.categoria === "infantil" ? `Infantil · ${formatoTamano(cofre.tamanoCm)}` : `${cofre.categoria === "ancho" ? "Ancho" : "Estándar"}${cofre.nivel ? ` · ${ETIQUETA_NIVEL[cofre.nivel]}` : ""}`}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="font-display text-2xl tabular-nums text-vino-900">{total}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${estilo.clase}`}>{estilo.etiqueta}</span>
                </div>
                {sedeActiva === "all" && porSede.length > 0 && (
                  <p className="mt-1 text-xs text-tinta/70">{porSede.map((s) => `${s.sede}: ${s.cantidad}`).join(" · ")}</p>
                )}
                <button
                  onClick={() => setActualizando(cofre)}
                  className="mt-3 flex min-h-[40px] items-center justify-center gap-2 self-start rounded-lg border border-vino-100 px-3 text-sm font-medium text-vino-700 transition hover:bg-vino-50"
                >
                  <RefreshCw size={14} aria-hidden="true" /> Actualizar cantidad
                </button>
              </div>
            </article>
          );
        })}
        {cargando && <p className="text-sm text-tinta/70">Cargando…</p>}
        {!cargando && visibles.length === 0 && (
          <div className="rounded-2xl border border-dashed border-vino-400 bg-white p-8 text-center sm:col-span-2 xl:col-span-3">
            <p className="font-display text-lg text-vino-900">{cofres.length === 0 ? "Todavía no hay cofres en el catálogo" : "Nada en este filtro"}</p>
            <p className="text-sm text-tinta/70">{cofres.length === 0 ? "Agrégalos primero en la página Cofres." : "¡Bien! No hay cofres en esta situación."}</p>
          </div>
        )}
      </section>

      {actualizando && (
        <ModalCantidad
          cofre={actualizando}
          sedeFija={rol === "admin" ? (sedeActiva === "all" ? null : sedeActiva) : sedeAsignada}
          inventario={inventario}
          onCerrar={() => setActualizando(null)}
        />
      )}
    </div>
  );
}

/** Misma acción de antes (actualizarInventario), con la cantidad actual ya escrita. */
function ModalCantidad({
  cofre,
  sedeFija,
  inventario,
  onCerrar,
}: {
  cofre: TipoCofre;
  /** null = admin viendo todas las sedes: debe elegir la sede. */
  sedeFija: string | null;
  inventario: InventarioCofre[];
  onCerrar: () => void;
}) {
  const [sede, setSede] = useState<string>(sedeFija ?? "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const actual = inventario.find((i) => i.tipoCofreId === cofre.id && i.sede === sede)?.cantidadDisponible ?? 0;

  async function manejarGuardar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!sede) return setError("Elige la sede.");
    setError(null);
    setGuardando(true);
    const form = new FormData(e.currentTarget);
    try {
      await actualizarInventario({ sede, tipoCofreId: cofre.id, cantidadDisponible: Number(form.get("cantidadDisponible")) });
      onCerrar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el inventario.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal antetitulo={cofre.referencia} titulo="Actualizar cantidad" onCerrar={onCerrar}>
      <form onSubmit={manejarGuardar} className="space-y-4">
        {sedeFija === null ? (
          <div>
            <label htmlFor="inv-sede" className="mb-1 block text-sm font-medium">Sede</label>
            <select id="inv-sede" value={sede} onChange={(e) => setSede(e.target.value)} required className="w-full rounded-lg border border-vino-100 px-3 py-2 text-sm">
              <option value="">Elige la sede…</option>
              {SEDES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        ) : (
          <p className="text-sm text-tinta/70">Sede <span className="font-medium text-tinta">{sedeFija}</span></p>
        )}
        <div>
          <label htmlFor="inv-cantidad" className="mb-1 block text-sm font-medium">Cantidad disponible</label>
          <input
            key={sede}
            id="inv-cantidad"
            name="cantidadDisponible"
            type="number"
            min={0}
            required
            defaultValue={sede ? actual : undefined}
            className="w-full rounded-lg border border-vino-100 px-3 py-2 text-lg tabular-nums"
          />
          {sede && <p className="mt-1 text-xs text-tinta/70">Hoy hay {actual} en {sede}. Escribe cuántos hay ahora.</p>}
        </div>
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <PieFormulario onCancelar={onCerrar} guardando={guardando} textoGuardar="Guardar cantidad" />
      </form>
    </Modal>
  );
}
