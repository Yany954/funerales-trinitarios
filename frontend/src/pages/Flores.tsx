import { useEffect, useState, FormEvent } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { Flower2, Pencil, Trash2 } from "lucide-react";
import { db, crearFlor, actualizarFlor, eliminarFlor } from "../api/client";
import DataTable from "../components/DataTable";
import SubirFoto from "../components/SubirFoto";
import { formatoPesos } from "../utils/formato";
import { confirmarEliminar } from "../utils/confirmar";
import type { Flor } from "../types";

export default function Flores() {
  const [flores, setFlores] = useState<Flor[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editando, setEditando] = useState<Flor | null>(null);
  const [fotoURL, setFotoURL] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return onSnapshot(
      query(collection(db, "flores")),
      (snap) => { setFlores(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Flor))); setCargando(false); },
      (err) => console.error("Error cargando flores:", err)
    );
  }, []);

  function abrirParaCrear() {
    setEditando(null);
    setFotoURL("");
    setMostrarFormulario(true);
  }

  function abrirParaEditar(flor: Flor) {
    setEditando(flor);
    setFotoURL(flor.fotoURL ?? "");
    setMostrarFormulario(true);
  }

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
      setMostrarFormulario(false);
      setEditando(null);
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la flor.");
    } finally {
      setGuardando(false);
    }
  }

  async function manejarEliminar(flor: Flor) {
    const confirmado = await confirmarEliminar(flor.nombre);
    if (!confirmado) return;
    try {
      await eliminarFlor(flor.id);
    } catch (err) {
      console.error("Error eliminando flor:", err);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg text-vino-900">Catálogo de flores</h2>
        <button onClick={abrirParaCrear} className="flex items-center gap-2 rounded-lg bg-buganvilla px-4 py-2.5 text-sm font-medium text-white hover:opacity-90">
          <Flower2 size={16} /> Nueva flor
        </button>
      </div>

      {mostrarFormulario && (
        <form onSubmit={manejarGuardar} className="space-y-3 rounded-xl border border-vino-100 bg-white p-4">
          <p className="text-sm font-medium text-vino-900">{editando ? `Editando: ${editando.nombre}` : "Nueva flor"}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <input name="nombre" required defaultValue={editando?.nombre} placeholder="Nombre (ej. Ramo pequeño)" className="rounded-lg border border-vino-100 px-3 py-2 text-sm" />
            <input name="precioCosto" type="number" required defaultValue={editando?.precioCosto} placeholder="Precio costo" className="rounded-lg border border-vino-100 px-3 py-2 text-sm" />
            <input name="precioPublico" type="number" required defaultValue={editando?.precioPublico} placeholder="Precio público" className="rounded-lg border border-vino-100 px-3 py-2 text-sm" />
          </div>
          <SubirFoto carpeta="flores" valorActual={editando?.fotoURL} onSubido={setFotoURL} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={guardando} className="rounded-lg bg-vino-700 px-4 py-2 text-sm font-medium text-white hover:bg-vino-600 disabled:opacity-60">
              {guardando ? "Guardando…" : editando ? "Guardar cambios" : "Guardar flor"}
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
            encabezado: "Foto",
            render: (f: Flor) => f.fotoURL
              ? <img src={f.fotoURL} alt="" className="h-10 w-10 rounded-md object-cover" />
              : <div className="h-10 w-10 rounded-md bg-vino-50" />,
          },
          { encabezado: "Nombre", render: (f: Flor) => f.nombre },
          { encabezado: "Costo", render: (f: Flor) => formatoPesos(f.precioCosto) },
          { encabezado: "Público", render: (f: Flor) => formatoPesos(f.precioPublico) },
          {
            encabezado: "Acciones",
            render: (f: Flor) => (
              <div className="flex gap-2">
                <button onClick={() => abrirParaEditar(f)} className="text-vino-700 hover:underline"><Pencil size={14} /></button>
                <button onClick={() => manejarEliminar(f)} className="text-red-600 hover:underline"><Trash2 size={14} /></button>
              </div>
            ),
          },
        ]}
        filas={flores}
        cargando={cargando}
        claveFila={(f) => f.id}
        vacioTitulo="Todavía no hay flores en el catálogo"
        vacioDescripcion='Usa "Nueva flor" para agregar la primera.'
      />
    </div>
  );
}