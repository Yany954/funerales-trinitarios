import { useEffect, useState, FormEvent } from "react";
import { collection, onSnapshot, orderBy, query, Timestamp } from "firebase/firestore";
import { Landmark } from "lucide-react";
import { db, registrarBoveda } from "../api/client";
import DataTable from "../components/DataTable";
import type { Boveda, EstadoBoveda } from "../types";

const PESTAÑAS: { valor: EstadoBoveda | "todas"; etiqueta: string }[] = [
  { valor: "todas", etiqueta: "Todas" },
  { valor: "vigente", etiqueta: "Vigentes" },
  { valor: "por vencer", etiqueta: "Por vencer" },
  { valor: "vencida", etiqueta: "Vencidas" },
];

function aFecha(valor: unknown): string {
  if (valor instanceof Timestamp) return valor.toDate().toLocaleDateString("es-CO");
  if (typeof valor === "string") return new Date(valor).toLocaleDateString("es-CO");
  return "—";
}

export default function Bovedas() {
  const [bovedas, setBovedas] = useState<Boveda[]>([]);
  const [cargando, setCargando] = useState(true);
  const [pestaña, setPestaña] = useState<EstadoBoveda | "todas">("todas");

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "bovedas"), orderBy("fechaLimite"));
    const unsub = onSnapshot(q, (snap) => {
      setBovedas(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Boveda)));
      setCargando(false);
    });
    return unsub;
  }, []);

  const filtradas = pestaña === "todas" ? bovedas : bovedas.filter((b) => b.estado === pestaña);

  async function manejarCrear(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    const form = new FormData(e.currentTarget);
    try {
      await registrarBoveda({
        servicioId: String(form.get("servicioId")),
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {PESTAÑAS.map((p) => (
            <button
              key={p.valor}
              onClick={() => setPestaña(p.valor)}
              className={`rounded-full px-3.5 py-1.5 text-sm ${
                pestaña === p.valor ? "bg-vino-700 text-white" : "bg-white text-tinta/60 border border-vino-100"
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
            <input name="servicioId" required placeholder="ID del servicio" className="rounded-lg border border-vino-100 px-3 py-2 text-sm" />
            <input name="zona" required placeholder="Zona (ej. Pailitas-Pelaya-Tamalameque)" className="rounded-lg border border-vino-100 px-3 py-2 text-sm" />
            <input name="fechaInicio" type="date" required className="rounded-lg border border-vino-100 px-3 py-2 text-sm" />
            <input name="valorArriendo" type="number" required placeholder="Valor del arriendo" className="rounded-lg border border-vino-100 px-3 py-2 text-sm" />
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
          { encabezado: "Zona", render: (b: Boveda) => b.zona },
          { encabezado: "Inicio", render: (b: Boveda) => aFecha(b.fechaInicio) },
          { encabezado: "Vence", render: (b: Boveda) => aFecha(b.fechaLimite) },
          { encabezado: "Valor", render: (b: Boveda) => `$${b.valorArriendo.toLocaleString("es-CO")}` },
          {
            encabezado: "Estado",
            render: (b: Boveda) => (
              <span
                className={`rounded-full px-2.5 py-1 text-xs ${
                  b.estado === "vigente"
                    ? "bg-green-50 text-green-700"
                    : b.estado === "por vencer"
                    ? "bg-amber-50 text-amber-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {b.estado}
              </span>
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