import { useEffect, useState, FormEvent } from "react";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { Search, UserPlus } from "lucide-react";
import { db, crearAfiliado, buscarPersonaCubierta } from "../api/client";
import DataTable from "../components/DataTable";
import type { Afiliado, PersonaCubierta } from "../types";
import { useRol } from "../auth/RolContext";

export default function Afiliados() {
  const [afiliados, setAfiliados] = useState<Afiliado[]>([]);
  const [cargando, setCargando] = useState(true);

  const [termino, setTermino] = useState("");
  const [resultadosBusqueda, setResultadosBusqueda] = useState<PersonaCubierta[] | null>(null);
  const [buscando, setBuscando] = useState(false);

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { rol, sedeAsignada, sedeSeleccionada } = useRol();

  // Lectura en tiempo real — solo lectura, ver nota en api/client.ts
  useEffect(() => {
    const base = collection(db, "afiliados");
    const q = sedeSeleccionada === "all"
      ? query(base, orderBy("nombreCompleto"))
      : query(base, where("sede", "==", sedeSeleccionada), orderBy("nombreCompleto"));
    const unsub = onSnapshot(q, (snap) => {
      setAfiliados(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Afiliado)));
      setCargando(false);
    });
    return unsub;
  }, [sedeSeleccionada]);

  async function manejarBusqueda(e: FormEvent) {
    e.preventDefault();
    if (!termino.trim()) {
      setResultadosBusqueda(null);
      return;
    }
    setBuscando(true);
    try {
      const resultados = await buscarPersonaCubierta(termino.trim());
      setResultadosBusqueda(resultados);
    } finally {
      setBuscando(false);
    }
  }

  async function manejarCrear(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    const form = new FormData(e.currentTarget);
    try {
      await crearAfiliado({
        nombreCompleto: String(form.get("nombreCompleto")),
        cedula: String(form.get("cedula")),
        planId: String(form.get("planId")),
        beneficiarios: [],
        tieneSeguroVida: form.get("tieneSeguroVida") === "on",
      });
      setMostrarFormulario(false);
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el afiliado.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Búsqueda rápida: "¿esta persona tiene plan?" — por titular o beneficiario */}
      <form onSubmit={manejarBusqueda} className="flex gap-2">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-tinta/40" />
          <input
            value={termino}
            onChange={(e) => setTermino(e.target.value)}
            placeholder="Buscar por nombre o cédula (titular o beneficiario)…"
            className="w-full rounded-lg border border-vino-100 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-vino-400"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-vino-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-vino-600"
        >
          Buscar
        </button>
      </form>

      {buscando && <p className="text-sm text-tinta/50">Buscando…</p>}

      {resultadosBusqueda && !buscando && (
        <div className="rounded-xl border border-vino-100 bg-white p-4">
          {resultadosBusqueda.length === 0 ? (
            <p className="text-sm text-tinta/60">
              Nadie con ese nombre o cédula tiene plan con nosotros.
            </p>
          ) : (
            <ul className="divide-y divide-vino-50">
              {resultadosBusqueda.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-2 text-sm">
                  <span>
                    {r.nombreCompleto} · {r.cedula}
                  </span>
                  <span className="rounded-full bg-vino-50 px-2.5 py-1 text-xs text-vino-700">
                    {r.esTitular ? "Titular" : `Beneficiario (${r.parentesco})`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg text-vino-900">Todos los afiliados</h2>
        <button
          onClick={() => setMostrarFormulario((v) => !v)}
          className="flex items-center gap-2 rounded-lg bg-buganvilla px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
        >
          <UserPlus size={16} />
          Nuevo afiliado
        </button>
      </div>

      {mostrarFormulario && (
        <form onSubmit={manejarCrear} className="space-y-3 rounded-xl border border-vino-100 bg-white p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <input name="nombreCompleto" required placeholder="Nombre completo" className="rounded-lg border border-vino-100 px-3 py-2 text-sm" />
            <input name="cedula" required placeholder="Cédula" className="rounded-lg border border-vino-100 px-3 py-2 text-sm" />
            <select name="planId" required className="rounded-lg border border-vino-100 px-3 py-2 text-sm">
              <option value="">Plan…</option>
              <option value="girasol">Girasol — $20.000/mes</option>
              <option value="alianza">Alianza — $28.000/mes</option>
              <option value="bendiciones">Bendiciones — $32.000/mes</option>
              <option value="integral">Integral — $38.000/mes</option>
            </select>
            {rol === "admin" ? (
              <select name="sede" required className="rounded-lg border border-vino-100 px-3 py-2 text-sm">
                <option value="">Sede…</option>
                <option value="Pailitas">Pailitas</option>
                <option value="Tamalameque">Tamalameque</option>
                <option value="Pelaya">Pelaya</option>
                <option value="Curumaní">Curumaní</option>
              </select>
            ) : (
              <input type="hidden" name="sede" value={sedeAsignada ?? ""} />
            )}
            <label className="flex items-center gap-2 text-sm text-tinta/70">
              <input type="checkbox" name="tieneSeguroVida" />
              Tiene seguro de vida
            </label>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={guardando}
            className="rounded-lg bg-vino-700 px-4 py-2 text-sm font-medium text-white hover:bg-vino-600 disabled:opacity-60"
          >
            {guardando ? "Guardando…" : "Guardar afiliado"}
          </button>
        </form>
      )}

      <DataTable
        columnas={[
          { encabezado: "Nombre", render: (a: Afiliado) => a.nombreCompleto },
          { encabezado: "Cédula", render: (a: Afiliado) => a.cedula },
          { encabezado: "Plan", render: (a: Afiliado) => a.planId },
          {
            encabezado: "Estado",
            render: (a: Afiliado) => (
              <span
                className={`rounded-full px-2.5 py-1 text-xs ${a.estadoPlan === "activo"
                  ? "bg-green-50 text-green-700"
                  : a.estadoPlan === "en mora"
                    ? "bg-amber-50 text-amber-700"
                    : "bg-tinta/5 text-tinta/60"
                  }`}
              >
                {a.estadoPlan}
              </span>
            ),
          },
        ]}
        filas={afiliados}
        cargando={cargando}
        claveFila={(a) => a.id}
        vacioTitulo="Todavía no hay afiliados registrados"
        vacioDescripcion='Usa "Nuevo afiliado" para agregar el primero.'
      />
    </div>
  );
}
