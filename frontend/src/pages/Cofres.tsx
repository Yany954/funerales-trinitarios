import { useEffect, useState, FormEvent } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { Package, Pencil, Trash2 } from "lucide-react";
import { db, crearTipoCofre, actualizarTipoCofre, eliminarTipoCofre } from "../api/client";
import DataTable from "../components/DataTable";
import SubirFoto from "../components/SubirFoto";
import { confirmarEliminar } from "../utils/confirmar";
import type { TipoCofre, CategoriaCofre } from "../types";
import { formatoPesos, formatoTamano } from "../utils/formato";
import CampoPrecio from "../components/CampoPrecio";

const ETIQUETA_NIVEL: Record<NonNullable<TipoCofre["nivel"]>, string> = { basico: "Básico", semilujo: "Semilujo", lujo: "Lujo" };
const ETIQUETA_CATEGORIA: Record<CategoriaCofre, string> = { estandar: "Estándar", ancho: "Ancho (talla grande)", infantil: "Infantil" };

export default function Cofres() {
  const [cofres, setCofres] = useState<TipoCofre[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editando, setEditando] = useState<TipoCofre | null>(null);
  const [categoriaForm, setCategoriaForm] = useState<CategoriaCofre>("estandar");
  const [fotoURL, setFotoURL] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return onSnapshot(
      query(collection(db, "tipos_cofre")),
      (snap) => { setCofres(snap.docs.map((d) => ({ id: d.id, ...d.data() } as TipoCofre))); setCargando(false); },
      (err) => console.error("Error cargando cofres:", err)
    );
  }, []);

  function abrirParaCrear() {
    setEditando(null);
    setCategoriaForm("estandar");
    setFotoURL("");
    setMostrarFormulario(true);
  }

  function abrirParaEditar(cofre: TipoCofre) {
    setEditando(cofre);
    setCategoriaForm(cofre.categoria);
    setFotoURL(cofre.fotoURL ?? "");
    setMostrarFormulario(true);
  }

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
      setMostrarFormulario(false);
      setEditando(null);
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el cofre.");
    } finally {
      setGuardando(false);
    }
  }

  async function manejarEliminar(cofre: TipoCofre) {
    const confirmado = await confirmarEliminar(cofre.referencia);
    if (!confirmado) return;
    try {
      await eliminarTipoCofre(cofre.id);
    } catch (err) {
      console.error("Error eliminando cofre:", err);
    }
  }

  const columnasComunes = [
    {
      encabezado: "Foto",
      render: (c: TipoCofre) => c.fotoURL
        ? <img src={c.fotoURL} alt="" className="h-10 w-10 rounded-md object-cover" />
        : <div className="h-10 w-10 rounded-md bg-vino-50" />,
    },
    { encabezado: "Referencia", render: (c: TipoCofre) => c.referencia },
    { encabezado: "Precio", render: (c: TipoCofre) => formatoPesos(c.precio) },
    {
      encabezado: "Acciones",
      render: (c: TipoCofre) => (
        <div className="flex gap-2">
          <button onClick={() => abrirParaEditar(c)} className="text-vino-700 hover:underline"><Pencil size={14} /></button>
          <button onClick={() => manejarEliminar(c)} className="text-red-600 hover:underline"><Trash2 size={14} /></button>
        </div>
      ),
    },
  ];

  const adultos = cofres.filter((c) => c.categoria !== "infantil");
  const infantiles = cofres.filter((c) => c.categoria === "infantil");

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg text-vino-900">Catálogo de cofres</h2>
        <button onClick={abrirParaCrear} className="flex items-center gap-2 rounded-lg bg-buganvilla px-4 py-2.5 text-sm font-medium text-white hover:opacity-90">
          <Package size={16} /> Nuevo cofre
        </button>
      </div>

      {mostrarFormulario && (
        <form onSubmit={manejarGuardar} className="space-y-3 rounded-xl border border-vino-100 bg-white p-4">
          <p className="text-sm font-medium text-vino-900">{editando ? `Editando: ${editando.referencia}` : "Nuevo cofre"}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <select
              value={categoriaForm}
              onChange={(e) => setCategoriaForm(e.target.value as CategoriaCofre)}
              className="rounded-lg border border-vino-100 px-3 py-2 text-sm"
            >
              <option value="estandar">Estándar</option>
              <option value="ancho">Ancho (talla grande)</option>
              <option value="infantil">Infantil (por tamaño)</option>
            </select>

            {categoriaForm !== "infantil" ? (
              <select name="nivel" required defaultValue={editando?.nivel} className="rounded-lg border border-vino-100 px-3 py-2 text-sm">
                <option value="">Nivel…</option>
                <option value="basico">Básico</option>
                <option value="semilujo">Semilujo</option>
                <option value="lujo">Lujo</option>
              </select>
            ) : (
              <div className="flex gap-2">
                <input name="tamanoValor" type="number" step="0.01" required defaultValue={editando?.tamanoCm} placeholder="Tamaño" className="flex-1 rounded-lg border border-vino-100 px-3 py-2 text-sm" />
                <select name="tamanoUnidad" defaultValue="cm" className="rounded-lg border border-vino-100 px-3 py-2 text-sm">
                  <option value="cm">cm</option>
                  <option value="m">m</option>
                </select>
              </div>
            )}

            <input name="referencia" required defaultValue={editando?.referencia} placeholder="Referencia" className="rounded-lg border border-vino-100 px-3 py-2 text-sm" />
            <CampoPrecio name="precio" required valorInicial={editando?.precio} placeholder="Precio" />
            <input name="descripcion" defaultValue={editando?.descripcion} placeholder="Descripción (material, acabado)" className="rounded-lg border border-vino-100 px-3 py-2 text-sm sm:col-span-2" />
          </div>
          <SubirFoto carpeta="cofres" valorActual={editando?.fotoURL} onSubido={setFotoURL} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={guardando} className="rounded-lg bg-vino-700 px-4 py-2 text-sm font-medium text-white hover:bg-vino-600 disabled:opacity-60">
              {guardando ? "Guardando…" : editando ? "Guardar cambios" : "Guardar cofre"}
            </button>
            {editando && (
              <button type="button" onClick={() => { setMostrarFormulario(false); setEditando(null); }} className="rounded-lg border border-vino-100 px-4 py-2 text-sm text-tinta/60">
                Cancelar
              </button>
            )}
          </div>
        </form>
      )}

      <div className="space-y-3">
        <h3 className="font-display text-base text-vino-900">Cofres para adultos (estándar y ancho)</h3>
        <DataTable
          columnas={[
            columnasComunes[0],
            columnasComunes[1],
            { encabezado: "Categoría", render: (c: TipoCofre) => ETIQUETA_CATEGORIA[c.categoria] },
            { encabezado: "Nivel", render: (c: TipoCofre) => (c.nivel ? ETIQUETA_NIVEL[c.nivel] : "—") },
            columnasComunes[2],
            columnasComunes[3],
          ]}
          filas={adultos}
          cargando={cargando}
          claveFila={(c) => c.id}
          vacioTitulo="Todavía no hay cofres de adulto en el catálogo"
          vacioDescripcion='Usa "Nuevo cofre" para agregar el primero.'
        />
      </div>

      <div className="space-y-3">
        <h3 className="font-display text-base text-vino-900">Cofres infantiles (por tamaño)</h3>
        <DataTable
          columnas={[
            columnasComunes[0],
            columnasComunes[1],
            { encabezado: "Tamaño", render: (c: TipoCofre) => formatoTamano(c.tamanoCm) },
            columnasComunes[2],
            columnasComunes[3],
          ]}
          filas={infantiles}
          cargando={cargando}
          claveFila={(c) => c.id}
          vacioTitulo="Todavía no hay cofres infantiles en el catálogo"
          vacioDescripcion='Usa "Nuevo cofre" con categoría "Infantil" para agregar el primero.'
        />
      </div>
    </div>
  );
}