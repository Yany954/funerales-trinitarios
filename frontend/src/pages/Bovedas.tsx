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
        zona: String(form.get("zona")),
        fechaInicio: String(form.get("fechaInicio")),
        valorArriendo: Number(form.get("valorArriendo")),
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
  function copiarId(id: string) {
    navigator.clipboard.writeText(id);
    setIdCopiado(id);
    setTimeout(() => setIdCopiado(null), 1500);
  }

  return (
    <div className="space-y-6">
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
            <input name="zona" required placeholder="Zona (ej. Pailitas-Pelaya-Tamalameque)" className="rounded-lg border border-vino-100 px-3 py-2 text-sm" />
            <input name="fechaInicio" type="date" required className="rounded-lg border border-vino-100 px-3 py-2 text-sm" />
            <CampoPrecio name="valorArriendo" required placeholder="Valor del arriendo" />
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