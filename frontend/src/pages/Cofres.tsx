import { useEffect, useMemo, useState, FormEvent } from "react";
import { useEstadoCarga, AvisoCarga } from "../hooks/useEstadoCarga";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { Package, Pencil, Trash2, Plus } from "lucide-react";
import { db, crearTipoCofre, actualizarTipoCofre, eliminarTipoCofre } from "../api/client";
import SubirFoto from "../components/SubirFoto";
import Modal, { PieFormulario } from "../components/Modal";
import { confirmarEliminar } from "../utils/confirmar";
import type { TipoCofre, CategoriaCofre, InventarioCofre } from "../types";
import { formatoPesos, formatoTamano } from "../utils/formato";
import { ESTILO_STOCK, nivelStock, stockPorCofre } from "../utils/inventario";
import { useRol } from "../auth/RolContext";
import CampoPrecio from "../components/CampoPrecio";
import ImagenAmpliable from "../components/ImagenAmpliable";

const ETIQUETA_NIVEL: Record<NonNullable<TipoCofre["nivel"]>, string> = { basico: "Básico", semilujo: "Semilujo", lujo: "Lujo" };
const ETIQUETA_CATEGORIA: Record<CategoriaCofre, string> = { estandar: "Estándar", ancho: "Ancho (talla grande)", infantil: "Infantil" };
const ORDEN_NIVEL: Record<string, number> = { basico: 0, semilujo: 1, lujo: 2 };

/** Cofres viejos pueden no tener categoría guardada: se tratan como estándar. */
function categoriaDe(c: TipoCofre): CategoriaCofre {
  return c.categoria in ETIQUETA_CATEGORIA ? c.categoria : "estandar";
}

type Filtro = "todos" | CategoriaCofre;
const FILTROS: { valor: Filtro; etiqueta: string }[] = [
  { valor: "todos", etiqueta: "Todos" },
  { valor: "estandar", etiqueta: "Estándar" },
  { valor: "ancho", etiqueta: "Ancho" },
  { valor: "infantil", etiqueta: "Infantil" },
];

export default function Cofres() {
  const { rol, sedeAsignada, sedeSeleccionada, cargando: cargandoRol } = useRol();
  const sedeActiva = rol === "admin" ? sedeSeleccionada : sedeAsignada;
  const [cofres, setCofres] = useState<TipoCofre[]>([]);
  const [inventario, setInventario] = useState<InventarioCofre[]>([]);
  const carga = useEstadoCarga();
  const { cargando } = carga;
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [modal, setModal] = useState<{ cofre: TipoCofre | null } | null>(null);

  useEffect(() => {
    return onSnapshot(
      query(collection(db, "tipos_cofre")),
      (snap) => { setCofres(snap.docs.map((d) => ({ id: d.id, ...d.data() } as TipoCofre))); carga.listo(); },
      (err) => carga.fallo(err)
    );
  }, [carga.intento]);

  // Disponibles por sede, para mostrarlos en cada tarjeta (respeta la sede del usuario).
  useEffect(() => {
    if (cargandoRol || !sedeActiva) return;
    const base = collection(db, "inventario_cofres");
    const q = sedeActiva === "all" ? query(base) : query(base, where("sede", "==", sedeActiva));
    return onSnapshot(
      q,
      (snap) => setInventario(snap.docs.map((d) => ({ id: d.id, ...d.data() } as InventarioCofre))),
      (err) => console.error("Error cargando inventario:", err)
    );
  }, [sedeActiva, cargandoRol]);

  async function manejarEliminar(cofre: TipoCofre) {
    const confirmado = await confirmarEliminar(cofre.referencia);
    if (!confirmado) return;
    try {
      await eliminarTipoCofre(cofre.id);
    } catch (err) {
      console.error("Error eliminando cofre:", err);
    }
  }

  const stock = useMemo(() => stockPorCofre(inventario), [inventario]);
  const visibles = useMemo(
    () =>
      cofres
        .filter((c) => filtro === "todos" || categoriaDe(c) === filtro)
        .sort((a, b) =>
          a.categoria === "infantil" && b.categoria === "infantil"
            ? (a.tamanoCm ?? 0) - (b.tamanoCm ?? 0)
            : (ORDEN_NIVEL[a.nivel ?? ""] ?? 9) - (ORDEN_NIVEL[b.nivel ?? ""] ?? 9) || a.precio - b.precio
        ),
    [cofres, filtro]
  );
  const contar = (f: Filtro) => (f === "todos" ? cofres.length : cofres.filter((c) => categoriaDe(c) === f).length);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h2 className="font-display text-2xl text-vino-900">Catálogo de cofres</h2>
          <p className="mt-1 text-sm text-tinta/70">
            Los cofres que ofrece la funeraria, con su foto y precio. Las cantidades disponibles se actualizan en Inventario.
          </p>
        </div>
        <button
          onClick={() => setModal({ cofre: null })}
          className="flex min-h-[44px] items-center gap-2 rounded-lg bg-vino-700 px-4 text-sm font-medium text-white transition hover:bg-vino-600 active:translate-y-px"
        >
          <Plus size={16} aria-hidden="true" /> Nuevo cofre
        </button>
      </header>

      <AvisoCarga carga={carga} />

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrar por categoría">
        {FILTROS.map((f) => (
          <button
            key={f.valor}
            role="tab"
            aria-selected={filtro === f.valor}
            onClick={() => setFiltro(f.valor)}
            className={`min-h-[40px] rounded-full px-4 text-sm font-medium transition ${
              filtro === f.valor ? "bg-vino-700 text-white" : "border border-vino-100 bg-white text-tinta/70 hover:bg-vino-50"
            }`}
          >
            {f.etiqueta} <span className="tabular-nums opacity-70">({contar(f.valor)})</span>
          </button>
        ))}
      </div>

      <section aria-label="Cofres" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visibles.map((c) => (
          <TarjetaCofre
            key={c.id}
            cofre={c}
            stock={stock[c.id]}
            verPorSede={sedeActiva === "all"}
            onEditar={() => setModal({ cofre: c })}
            onEliminar={() => manejarEliminar(c)}
          />
        ))}
        {cargando && <p className="text-sm text-tinta/70">Cargando…</p>}
        {!cargando && visibles.length === 0 && (
          <div className="rounded-2xl border border-dashed border-vino-400 bg-white p-8 text-center sm:col-span-2 xl:col-span-3">
            <Package size={28} aria-hidden="true" className="mx-auto text-vino-400" />
            <p className="mt-2 font-display text-lg text-vino-900">{cofres.length === 0 ? "Todavía no hay cofres" : "No hay cofres en esta categoría"}</p>
            <p className="text-sm text-tinta/70">Agrega uno con el botón "Nuevo cofre".</p>
          </div>
        )}
      </section>

      {modal && <ModalCofre cofre={modal.cofre} onCerrar={() => setModal(null)} />}
    </div>
  );
}

function TarjetaCofre({
  cofre: c,
  stock,
  verPorSede,
  onEditar,
  onEliminar,
}: {
  cofre: TipoCofre;
  stock: { total: number; porSede: { sede: string; cantidad: number }[] } | undefined;
  verPorSede: boolean;
  onEditar: () => void;
  onEliminar: () => void;
}) {
  const total = stock?.total ?? 0;
  const estilo = ESTILO_STOCK[nivelStock(total)];
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-vino-100 bg-white transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="aspect-[4/3] bg-crema">
        {c.fotoURL ? (
          <ImagenAmpliable src={c.fotoURL} alt={c.referencia} bloque className="aspect-[4/3] w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-vino-400">
            <Package size={40} aria-hidden="true" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-xl text-vino-900">{c.referencia}</h3>
          <div className="flex shrink-0 gap-1">
            <button aria-label={`Editar ${c.referencia}`} onClick={onEditar} className="rounded-lg p-2 text-vino-700 hover:bg-vino-50">
              <Pencil size={16} aria-hidden="true" />
            </button>
            <button aria-label={`Eliminar ${c.referencia}`} onClick={onEliminar} className="rounded-lg p-2 text-red-600 hover:bg-red-50">
              <Trash2 size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-vino-50 px-2.5 py-0.5 text-xs font-medium text-vino-700">{ETIQUETA_CATEGORIA[categoriaDe(c)]}</span>
          {c.categoria === "infantil" ? (
            <span className="rounded-full bg-vino-50 px-2.5 py-0.5 text-xs font-medium text-vino-700">{formatoTamano(c.tamanoCm)}</span>
          ) : c.nivel ? (
            <span className="rounded-full bg-vino-50 px-2.5 py-0.5 text-xs font-medium text-vino-700">{ETIQUETA_NIVEL[c.nivel]}</span>
          ) : null}
        </div>
        {c.descripcion && <p className="mt-2 text-sm text-tinta/70">{c.descripcion}</p>}
        <p className="mt-3 font-display text-2xl text-vino-900 tabular-nums">{formatoPesos(c.precio)}</p>
        <div className="mt-auto pt-4">
          <div className="flex items-center justify-between gap-2 rounded-xl bg-crema px-3 py-2">
            <span className="text-sm text-tinta/70">
              <span className="font-semibold tabular-nums text-tinta">{total}</span> disponibles
            </span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${estilo.clase}`}>{estilo.etiqueta}</span>
          </div>
          {verPorSede && stock && stock.porSede.length > 0 && (
            <p className="mt-2 text-xs text-tinta/70">{stock.porSede.map((s) => `${s.sede}: ${s.cantidad}`).join(" · ")}</p>
          )}
        </div>
      </div>
    </article>
  );
}

/** Mismo formulario y misma lógica de antes, ahora en una ventana emergente. */
function ModalCofre({ cofre: editando, onCerrar }: { cofre: TipoCofre | null; onCerrar: () => void }) {
  const [categoriaForm, setCategoriaForm] = useState<CategoriaCofre>(editando ? categoriaDe(editando) : "estandar");
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
        categoria: categoriaForm,
        nivel: categoriaForm !== "infantil" ? (String(form.get("nivel")) as TipoCofre["nivel"]) : undefined,
        tamanoCm: form.get("tamanoValor")
          ? Number(form.get("tamanoValor")) * (form.get("tamanoUnidad") === "m" ? 100 : 1)
          : undefined,
        referencia: String(form.get("referencia")),
        precio: Number(form.get("precio")),
        descripcion: String(form.get("descripcion") || "") || undefined,
        fotoURL: fotoURL || undefined,
      };
      if (editando) {
        await actualizarTipoCofre({ id: editando.id, ...datos });
      } else {
        await crearTipoCofre(datos);
      }
      onCerrar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el cofre.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal titulo={editando ? `Editar ${editando.referencia}` : "Nuevo cofre"} onCerrar={onCerrar} ancho="max-w-lg">
      <form onSubmit={manejarGuardar} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="cofre-categoria" className="mb-1 block text-sm font-medium">Categoría</label>
            <select id="cofre-categoria" value={categoriaForm} onChange={(e) => setCategoriaForm(e.target.value as CategoriaCofre)} className="w-full rounded-lg border border-vino-100 px-3 py-2 text-sm">
              <option value="estandar">Estándar</option>
              <option value="ancho">Ancho (talla grande)</option>
              <option value="infantil">Infantil (por tamaño)</option>
            </select>
          </div>
          {categoriaForm !== "infantil" ? (
            <div>
              <label htmlFor="cofre-nivel" className="mb-1 block text-sm font-medium">Nivel</label>
              <select id="cofre-nivel" name="nivel" required defaultValue={editando?.nivel} className="w-full rounded-lg border border-vino-100 px-3 py-2 text-sm">
                <option value="">Elige…</option>
                <option value="basico">Básico</option>
                <option value="semilujo">Semilujo</option>
                <option value="lujo">Lujo</option>
              </select>
            </div>
          ) : (
            <div>
              <label htmlFor="cofre-tamano" className="mb-1 block text-sm font-medium">Tamaño</label>
              <div className="flex gap-2">
                <input id="cofre-tamano" name="tamanoValor" type="number" step="0.01" required defaultValue={editando?.tamanoCm} placeholder="Ej. 80" className="w-full flex-1 rounded-lg border border-vino-100 px-3 py-2 text-sm" />
                <select name="tamanoUnidad" aria-label="Unidad" defaultValue="cm" className="rounded-lg border border-vino-100 px-3 py-2 text-sm">
                  <option value="cm">cm</option>
                  <option value="m">m</option>
                </select>
              </div>
            </div>
          )}
          <div>
            <label htmlFor="cofre-referencia" className="mb-1 block text-sm font-medium">Referencia</label>
            <input id="cofre-referencia" name="referencia" required defaultValue={editando?.referencia} placeholder="Ej. Cofre Imperial" className="w-full rounded-lg border border-vino-100 px-3 py-2 text-sm" />
          </div>
          <div>
            <label htmlFor="cofre-precio" className="mb-1 block text-sm font-medium">Precio</label>
            <CampoPrecio id="cofre-precio" name="precio" required valorInicial={editando?.precio} placeholder="Ej. 1.200.000" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="cofre-descripcion" className="mb-1 block text-sm font-medium">Descripción (opcional)</label>
            <input id="cofre-descripcion" name="descripcion" defaultValue={editando?.descripcion} placeholder="Material, acabado…" className="w-full rounded-lg border border-vino-100 px-3 py-2 text-sm" />
          </div>
        </div>
        <SubirFoto carpeta="cofres" valorActual={editando?.fotoURL} onSubido={setFotoURL} />
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <PieFormulario onCancelar={onCerrar} guardando={guardando} textoGuardar={editando ? "Guardar cambios" : "Guardar cofre"} />
      </form>
    </Modal>
  );
}
