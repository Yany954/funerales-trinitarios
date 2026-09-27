import { useEffect, useState, FormEvent } from "react";
import { collection, onSnapshot, orderBy, query, where, Timestamp } from "firebase/firestore";
import { Landmark } from "lucide-react";
import { db, registrarBoveda } from "../api/client";
import DataTable from "../components/DataTable";
import { formatoPesos } from "../utils/formato";
import { useRol } from "../auth/RolContext";
import type { Boveda, EstadoBoveda, Sede } from "../types";
import { useSearchParams } from "react-router-dom";
import { Copy, Check } from "lucide-react";
import CampoPrecio from "../components/CampoPrecio";
  import { crearItemBoveda, actualizarItemBoveda, eliminarItemBoveda } from "../api/client";
import { confirmarEliminar } from "../utils/confirmar";
import { VEREDAS_POR_MUNICIPIO } from "../types";
import type { ItemBoveda } from "../types";
const SEDES: Sede[] = ["Pailitas", "Tamalameque", "Pelaya", "Curumaní"];

const PESTAÑAS: { valor: EstadoBoveda | "todas"; etiqueta: string }[] = [
  { valor: "todas", etiqueta: "Todas" },
  { valor: "vigente", etiqueta: "Vigentes" },
  { valor: "por vencer", etiqueta: "Por vencer" },
  { valor: "vencida", etiqueta: "Vencidas" },
];

function aFecha(valor: unknown): string {
  if (valor instanceof Timestamp) return valor.toDate().toLocaleDateString("es-CO");
  return "—";
}

export default function Bovedas() {
  const { rol, sedeAsignada, sedeSeleccionada, cargando: cargandoRol } = useRol();
  const [bovedas, setBovedas] = useState<Boveda[]>([]);
  const [cargando, setCargando] = useState(true);
  const [searchParams] = useSearchParams();
  const estadoInicial = (searchParams.get("estado") as EstadoBoveda | null) ?? "todas";
  const [pestaña, setPestaña] = useState<EstadoBoveda | "todas">(estadoInicial);

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idCopiado, setIdCopiado] = useState<string | null>(null);


// junto a tus otros useState:
const [itemsBoveda, setItemsBoveda] = useState<ItemBoveda[]>([]);
const [mostrarCatalogo, setMostrarCatalogo] = useState(false);
const [editandoItem, setEditandoItem] = useState<ItemBoveda | null>(null);

const [itemSeleccionado, setItemSeleccionado] = useState("");
const [usarValorManual, setUsarValorManual] = useState(false);
const [municipioForm, setMunicipioForm] = useState("Pailitas");

useEffect(() => {
  return onSnapshot(query(collection(db, "items_boveda")), (snap) => setItemsBoveda(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ItemBoveda))));
}, []);

  useEffect(() => {
    if (cargandoRol) return;
    const base = collection(db, "bovedas");
    const q = sedeSeleccionada === "all"
      ? query(base, orderBy("fechaLimite"))
      : query(base, where("sede", "==", sedeSeleccionada), orderBy("fechaLimite"));
    return onSnapshot(
      q,
      (snap) => { setBovedas(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Boveda))); setCargando(false); },
      (err) => console.error("Error en la consulta:", err)
    );
  }, [sedeSeleccionada, cargandoRol]);

  if (cargandoRol) return <div className="py-16 text-center text-tinta/50">Cargando…</div>;

  const filtradas = pestaña === "todas" ? bovedas : bovedas.filter((b) => b.estado === pestaña);

  // Resumen por estado, sobre lo que esté cargado (respeta el filtro de sede activo del header).
  const conteo = {
    vigente: bovedas.filter((b) => b.estado === "vigente").length,
    "por vencer": bovedas.filter((b) => b.estado === "por vencer").length,
    vencida: bovedas.filter((b) => b.estado === "vencida").length,
  };

  async function manejarCrear(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    const form = new FormData(e.currentTarget);
    try {
      await registrarBoveda({
  sede: (rol === "admin" ? String(form.get("sede")) : sedeAsignada) as Sede,
  servicioId: String(form.get("servicioId") || "") || undefined,
  zona: String(form.get("zona") || ""),
  itemBovedaId: usarValorManual ? undefined : itemSeleccionado || undefined,
  valorArriendo: usarValorManual ? Number(form.get("valorArriendoManual")) : undefined,
  fechaInicio: String(form.get("fechaInicio")),
  incluyeExhumacion: form.get("incluyeExhumacion") === "on",
});
      setMostrarFormulario(false);
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar la bóveda.");
    } finally {
      setGuardando(false);
    }
  }
  async function manejarGuardarItem(e: FormEvent<HTMLFormElement>) {
  e.preventDefault();
  const form = new FormData(e.currentTarget);
  const datos = { nombre: String(form.get("nombre")), zona: String(form.get("zonaItem")), precio: Number(form.get("precioItem")) };
  if (editandoItem) {
    await actualizarItemBoveda({ id: editandoItem.id, ...datos });
  } else {
    await crearItemBoveda(datos);
  }
  setEditandoItem(null);
  (e.target as HTMLFormElement).reset();
}

async function manejarEliminarItem(item: ItemBoveda) {
  const confirmado = await confirmarEliminar(item.nombre);
  if (!confirmado) return;
  await eliminarItemBoveda(item.id);
}
  function copiarId(id: string) {
    navigator.clipboard.writeText(id);
    setIdCopiado(id);
    setTimeout(() => setIdCopiado(null), 1500);
  }

  return (
    
    
       <div className="space-y-6">
      {/* Catálogo de precios de bóveda */}
      <div className="rounded-xl border border-vino-100 bg-white p-4">
        <button onClick={() => setMostrarCatalogo((v) => !v)} className="text-sm font-medium text-vino-900">
          {mostrarCatalogo ? "▾" : "▸"} Catálogo de precios de bóveda ({itemsBoveda.length})
        </button>
        {mostrarCatalogo && (
          <div className="mt-3 space-y-3">
            <form onSubmit={manejarGuardarItem} className="grid gap-2 sm:grid-cols-4">
              <input name="nombre" required defaultValue={editandoItem?.nombre} placeholder="Nombre (ej. Bóveda Pailitas-Pelaya)" className="rounded-lg border border-vino-100 px-3 py-2 text-sm sm:col-span-2" />
              <input name="zonaItem" required defaultValue={editandoItem?.zona} placeholder="Zona que cubre" className="rounded-lg border border-vino-100 px-3 py-2 text-sm" />
              <CampoPrecio name="precioItem" required valorInicial={editandoItem?.precio} placeholder="Precio" />
              <button type="submit" className="sm:col-span-4 rounded-lg bg-vino-700 px-4 py-2 text-sm text-white">
                {editandoItem ? "Guardar cambios" : "Agregar al catálogo"}
              </button>
            </form>
            <div className="divide-y divide-vino-50">
              {itemsBoveda.map((i) => (
                <div key={i.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{i.nombre} — {formatoPesos(i.precio)}</span>
                  <div className="flex gap-2">
                    <button onClick={() => setEditandoItem(i)} className="text-vino-700 hover:underline">Editar</button>
                    <button onClick={() => manejarEliminarItem(i)} className="text-red-600 hover:underline">Eliminar</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Resumen rápido de la sede/filtro actual */}
      <div className="grid grid-cols-3 gap-3">
        {(["vigente", "por vencer", "vencida"] as const).map((estado) => (
          <div key={estado} className="rounded-xl border border-vino-100 bg-white p-4 text-center">
            <p className="text-xs capitalize text-tinta/50">{estado}</p>
            <p className="font-display text-xl text-vino-900">{conteo[estado]}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {PESTAÑAS.map((p) => (
            <button
              key={p.valor}
              onClick={() => setPestaña(p.valor)}
              className={`rounded-full px-3.5 py-1.5 text-sm ${pestaña === p.valor ? "bg-vino-700 text-white" : "bg-white text-tinta/60 border border-vino-100"
                }`}
            >
              {p.etiqueta}
            </button>
          ))}
        </div>
        <button
          onClick={() => setMostrarFormulario((v) => !v)}
          className="flex items-center gap-2 rounded-lg bg-buganvilla px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
        >
          <Landmark size={16} />
          Registrar bóveda
        </button>
      </div>

      {mostrarFormulario && (
        <form onSubmit={manejarCrear} className="space-y-3 rounded-xl border border-vino-100 bg-white p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {rol === "admin" ? (
              <select name="sede" required className="rounded-lg border border-vino-100 px-3 py-2 text-sm">
                <option value="">Sede…</option>
                {SEDES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : (
              <input type="hidden" name="sede" value={sedeAsignada ?? ""} />
            )}
            <input name="servicioId" placeholder="ID del servicio" className="rounded-lg border border-vino-100 px-3 py-2 text-sm" />
            <select
  value={municipioForm}
  onChange={(e) => setMunicipioForm(e.target.value)}
  className="rounded-lg border border-vino-100 px-3 py-2 text-sm"
>
  {Object.keys(VEREDAS_POR_MUNICIPIO).map((m) => <option key={m} value={m}>{m}</option>)}
</select>
<select name="zona" required className="rounded-lg border border-vino-100 px-3 py-2 text-sm">
  {VEREDAS_POR_MUNICIPIO[municipioForm].map((v) => <option key={v} value={`${municipioForm} - ${v}`}>{v}</option>)}
</select>

<select
  value={itemSeleccionado}
  onChange={(e) => setItemSeleccionado(e.target.value)}
  disabled={usarValorManual}
  className="rounded-lg border border-vino-100 px-3 py-2 text-sm disabled:bg-vino-50"
>
  <option value="">Ítem del catálogo…</option>
  {itemsBoveda.map((i) => <option key={i.id} value={i.id}>{i.nombre} — {formatoPesos(i.precio)}</option>)}
</select>

<label className="flex items-center gap-2 text-sm text-tinta/70">
  <input type="checkbox" checked={usarValorManual} onChange={(e) => setUsarValorManual(e.target.checked)} />
  Ingresar valor manual (en vez del catálogo)
</label>
{usarValorManual && (
  <CampoPrecio name="valorArriendoManual" placeholder="Valor de la bóveda" />
)}
            <input name="fechaInicio" type="date" required className="rounded-lg border border-vino-100 px-3 py-2 text-sm" />
            
            <label className="flex items-center gap-2 text-sm text-tinta/70">
              <input type="checkbox" name="incluyeExhumacion" />
              Incluye exhumación
            </label>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={guardando}
            className="rounded-lg bg-vino-700 px-4 py-2 text-sm font-medium text-white hover:bg-vino-600 disabled:opacity-60"
          >
            {guardando ? "Guardando…" : "Guardar bóveda"}
          </button>
        </form>
      )}

      <DataTable
        columnas={[
          { encabezado: "Sede", render: (b: Boveda) => b.sede },
          { encabezado: "Zona", render: (b: Boveda) => b.zona },
          { encabezado: "Inicio", render: (b: Boveda) => aFecha(b.fechaInicio) },
          { encabezado: "Vence", render: (b: Boveda) => aFecha(b.fechaLimite) },
          { encabezado: "Valor", render: (b: Boveda) => formatoPesos(b.valorArriendo) },
          {
            encabezado: "Estado",
            render: (b: Boveda) => (
              <span
                className={`rounded-full px-2.5 py-1 text-xs ${b.estado === "vigente" ? "bg-green-50 text-green-700"
                  : b.estado === "por vencer" ? "bg-amber-50 text-amber-700"
                    : "bg-red-50 text-red-700"
                  }`}
              >
                {b.estado}
              </span>
            ),
          },
          {
            encabezado: "Servicio",
            render: (b: Boveda) =>
              b.servicioId ? (
                <button onClick={() => copiarId(b.servicioId!)} className="flex items-center gap-1 font-mono text-xs text-tinta/50 hover:text-vino-700">
                  {b.servicioId.slice(0, 8)}…
                  {idCopiado === b.servicioId ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                </button>
              ) : (
                <span className="text-xs text-tinta/40">Sin servicio</span>
              ),
          },
        ]}
        filas={filtradas}
        cargando={cargando}
        claveFila={(b) => b.id}
        vacioTitulo="No hay bóvedas en esta categoría"
        vacioDescripcion='Usa "Registrar bóveda" para agregar la primera.'
      />
    </div>
  );
}