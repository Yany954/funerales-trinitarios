import { useEffect, useMemo, useState, FormEvent } from "react";
import { useEstadoCarga, AvisoCarga } from "../hooks/useEstadoCarga";
import { collection, onSnapshot, query } from "firebase/firestore";
import { Flower2, Pencil, Trash2, Plus, Search, TrendingUp } from "lucide-react";
import { db, crearFlor, actualizarFlor, eliminarFlor } from "../api/client";
import SubirFoto from "../components/SubirFoto";
import Modal, { PieFormulario } from "../components/Modal";
import { formatoPesos } from "../utils/formato";
import { confirmarEliminar } from "../utils/confirmar";
import type { Flor } from "../types";
import CampoPrecio from "../components/CampoPrecio";
import ImagenAmpliable from "../components/ImagenAmpliable";

/** Sin tildes ni mayúsculas, para buscar "girasol" y encontrar "Girásol". */
const normalizar = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function Flores() {
  const [flores, setFlores] = useState<Flor[]>([]);
  const carga = useEstadoCarga();
  const { cargando } = carga;
  const [busqueda, setBusqueda] = useState("");
  const [modal, setModal] = useState<{ flor: Flor | null } | null>(null);

  useEffect(() => {
    return onSnapshot(
      query(collection(db, "flores")),
      (snap) => { setFlores(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Flor))); carga.listo(); },
      (err) => carga.fallo(err)
    );
  }, [carga.intento]);

  async function manejarEliminar(flor: Flor) {
    const confirmado = await confirmarEliminar(flor.nombre);
    if (!confirmado) return;
    try {
      await eliminarFlor(flor.id);
    } catch (err) {
      console.error("Error eliminando flor:", err);
    }
  }

  const visibles = useMemo(
    () => flores.filter((f) => normalizar(f.nombre).includes(normalizar(busqueda.trim()))).sort((a, b) => a.precioPublico - b.precioPublico),
    [flores, busqueda]
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h2 className="font-display text-2xl text-vino-900">Catálogo de flores</h2>
          <p className="mt-1 text-sm text-tinta/70">
            Arreglos y ramos que se ofrecen en los servicios, con su costo, su precio al público y lo que deja cada uno.
          </p>
        </div>
        <button
          onClick={() => setModal({ flor: null })}
          className="flex min-h-[44px] items-center gap-2 rounded-lg bg-vino-700 px-4 text-sm font-medium text-white transition hover:bg-vino-600 active:translate-y-px"
        >
          <Plus size={16} aria-hidden="true" /> Nueva flor
        </button>
      </header>

      <AvisoCarga carga={carga} />

      {flores.length > 0 && (
        <label className="relative block max-w-sm">
          <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-tinta/50" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre…"
            aria-label="Buscar flor por nombre"
            className="w-full rounded-lg border border-vino-100 bg-white py-2.5 pl-9 pr-3 text-sm"
          />
        </label>
      )}

      <section aria-label="Flores" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visibles.map((f) => {
          const ganancia = f.precioPublico - f.precioCosto;
          const porcentaje = f.precioCosto > 0 ? (ganancia / f.precioCosto) * 100 : null;
          return (
            <article key={f.id} className="flex flex-col overflow-hidden rounded-2xl border border-vino-100 bg-white transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="aspect-[4/3] bg-crema">
                {f.fotoURL ? (
                  <ImagenAmpliable src={f.fotoURL} alt={f.nombre} bloque className="aspect-[4/3] w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-vino-400">
                    <Flower2 size={40} aria-hidden="true" />
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display text-xl text-vino-900">{f.nombre}</h3>
                  <div className="flex shrink-0 gap-1">
                    <button aria-label={`Editar ${f.nombre}`} onClick={() => setModal({ flor: f })} className="rounded-lg p-2 text-vino-700 hover:bg-vino-50">
                      <Pencil size={16} aria-hidden="true" />
                    </button>
                    <button aria-label={`Eliminar ${f.nombre}`} onClick={() => manejarEliminar(f)} className="rounded-lg p-2 text-red-600 hover:bg-red-50">
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                </div>
                <p className="mt-2 flex items-baseline gap-1.5">
                  <span className="font-display text-2xl text-vino-900 tabular-nums">{formatoPesos(f.precioPublico)}</span>
                  <span className="text-sm text-tinta/70">al público</span>
                </p>
                <div className="mt-auto pt-4">
                  <dl className="grid grid-cols-2 gap-3 rounded-xl bg-crema p-3 text-sm">
                    <div>
                      <dt className="text-xs text-tinta/70">Costo</dt>
                      <dd className="font-semibold tabular-nums text-tinta">{formatoPesos(f.precioCosto)}</dd>
                    </div>
                    <div>
                      <dt className="flex items-center gap-1 text-xs text-tinta/70">
                        <TrendingUp size={12} aria-hidden="true" /> Ganancia
                      </dt>
                      <dd className={`font-semibold tabular-nums ${ganancia >= 0 ? "text-green-700" : "text-red-700"}`}>
                        {formatoPesos(ganancia)}
                        {porcentaje !== null && <span className="ml-1 text-xs font-medium">({porcentaje >= 0 ? "+" : ""}{porcentaje.toFixed(0)} %)</span>}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </article>
          );
        })}
        {cargando && <p className="text-sm text-tinta/70">Cargando…</p>}
        {!cargando && visibles.length === 0 && (
          <div className="rounded-2xl border border-dashed border-vino-400 bg-white p-8 text-center sm:col-span-2 xl:col-span-3">
            <Flower2 size={28} aria-hidden="true" className="mx-auto text-vino-400" />
            <p className="mt-2 font-display text-lg text-vino-900">{flores.length === 0 ? "Todavía no hay flores en el catálogo" : "Ninguna flor tiene ese nombre"}</p>
            <p className="text-sm text-tinta/70">{flores.length === 0 ? 'Usa "Nueva flor" para agregar la primera.' : "Revisa lo que escribiste en el buscador."}</p>
          </div>
        )}
      </section>

      {modal && <ModalFlor flor={modal.flor} onCerrar={() => setModal(null)} />}
    </div>
  );
}

/** Mismo formulario y misma lógica de antes, en una ventana emergente. */
function ModalFlor({ flor: editando, onCerrar }: { flor: Flor | null; onCerrar: () => void }) {
  const [fotoURL, setFotoURL] = useState(editando?.fotoURL ?? "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function manejarGuardar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    const form = new FormData(e.currentTarget);
    try {
      const datos = {
        nombre: String(form.get("nombre")),
        precioCosto: Number(form.get("precioCosto")),
        precioPublico: Number(form.get("precioPublico")),
        fotoURL: fotoURL || undefined,
      };
      if (editando) {
        await actualizarFlor({ id: editando.id, ...datos });
      } else {
        await crearFlor(datos);
      }
      onCerrar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la flor.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal titulo={editando ? `Editar ${editando.nombre}` : "Nueva flor"} onCerrar={onCerrar}>
      <form onSubmit={manejarGuardar} className="space-y-4">
        <div>
          <label htmlFor="flor-nombre" className="mb-1 block text-sm font-medium">Nombre</label>
          <input id="flor-nombre" name="nombre" required defaultValue={editando?.nombre} placeholder="Ej. Ramo pequeño" className="w-full rounded-lg border border-vino-100 px-3 py-2 text-sm" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="flor-costo" className="mb-1 block text-sm font-medium">Precio de costo</label>
            <CampoPrecio id="flor-costo" name="precioCosto" required valorInicial={editando?.precioCosto} placeholder="Lo que nos cuesta" />
          </div>
          <div>
            <label htmlFor="flor-publico" className="mb-1 block text-sm font-medium">Precio al público</label>
            <CampoPrecio id="flor-publico" name="precioPublico" required valorInicial={editando?.precioPublico} placeholder="Lo que paga el cliente" />
          </div>
        </div>
        <SubirFoto carpeta="flores" valorActual={editando?.fotoURL} onSubido={setFotoURL} />
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <PieFormulario onCancelar={onCerrar} guardando={guardando} textoGuardar={editando ? "Guardar cambios" : "Guardar flor"} />
      </form>
    </Modal>
  );
}
