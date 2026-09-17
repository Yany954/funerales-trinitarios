import { useEffect, useState, FormEvent } from "react";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { Plus, Search, Trash2, UserPlus, Pencil, ClipboardList } from "lucide-react";
import { db, crearAfiliado, buscarPersonaCubierta } from "../api/client";
import DataTable from "../components/DataTable";
import type { Afiliado, Beneficiario, PlanFunerario, ResultadoBusquedaAfiliado } from "../types";
import { useRol } from "../auth/RolContext";
import PanelPagos from "../components/PanelPagos";
import { Receipt } from "lucide-react";
import { formatoPesos } from "../utils/formato";
import PanelBeneficiarios from "../components/PanelBeneficiarios";
import { Users } from "lucide-react";
import PanelEditarAfiliado from "../components/PanelEditarAfiliado";
import { eliminarAfiliado } from "../api/client";
import { confirmarEliminar } from "../utils/confirmar";
import PanelHistorialServicios from "../components/PanelHistorialServicios";


export default function Afiliados() {
  const [afiliados, setAfiliados] = useState<Afiliado[]>([]);
  const [cargando, setCargando] = useState(true);

  const [termino, setTermino] = useState("");
  const [buscando, setBuscando] = useState(false);

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { rol, sedeAsignada, sedeSeleccionada, cargando: cargandoRol } = useRol();
  const [planes, setPlanes] = useState<PlanFunerario[]>([]);
  const [mapaPlanes, setMapaPlanes] = useState<Record<string, string>>({});
  const [afiliadoPagos, setAfiliadoPagos] = useState<Afiliado | null>(null);
  const [beneficiariosNuevo, setBeneficiariosNuevo] = useState<Beneficiario[]>([]);
  const [afiliadoBeneficiarios, setAfiliadoBeneficiarios] = useState<Afiliado | null>(null);
  const [resultadosBusqueda, setResultadosBusqueda] = useState<ResultadoBusquedaAfiliado[] | null>(null);
  const [afiliadoEditando, setAfiliadoEditando] = useState<Afiliado | null>(null);
  const [afiliadoServicios, setAfiliadoServicios] = useState<Afiliado | null>(null);

  useEffect(() => {
    return onSnapshot(
      query(collection(db, "planes_funerarios")),
      (snap) => {
        const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() } as PlanFunerario));
        setPlanes(lista);

        const mapa: Record<string, string> = {};
        lista.forEach((p) => (mapa[p.id] = p.nombre));
        setMapaPlanes(mapa);
      },
      (err) => console.error("Error cargando planes:", err)
    );
  }, []);

  useEffect(() => {
    const base = collection(db, "afiliados");
    const q = sedeSeleccionada === "all"
      ? query(base, orderBy("nombreCompleto"))
      : query(base, where("sede", "==", sedeSeleccionada), orderBy("nombreCompleto"));
    const unsub = onSnapshot(q, (snap) => {
      setAfiliados(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Afiliado)));
      setCargando(false);
    }, (err) => console.error("Error en la consulta:", err));
    return unsub;
  }, [sedeSeleccionada]);

  if (cargandoRol) return <div className="py-16 text-center text-tinta/50">Cargando…</div>;

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
  async function manejarEliminarAfiliado(a: Afiliado) {
    const confirmado = await confirmarEliminar(a.nombreCompleto);
    if (!confirmado) return;
    try {
      await eliminarAfiliado(a.id);
    } catch (err) {
      console.error("Error eliminando afiliado:", err);
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
        numeroContrato: String(form.get("numeroContrato")), // ← nuevo
        planId: String(form.get("planId")),
        beneficiarios: beneficiariosNuevo.filter((b) => b.nombre.trim() && b.cedula.trim()),
        tieneSeguroVida: form.get("tieneSeguroVida") === "on",
      });
      setMostrarFormulario(false);
      setBeneficiariosNuevo([]);
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el afiliado.");
    } finally {
      setGuardando(false);
    }
  }
  function actualizarBeneficiarioNuevo(i: number, campo: keyof Beneficiario, valor: string) {
    setBeneficiariosNuevo((prev) => {
      const copia = [...prev];
      copia[i] = { ...copia[i], [campo]: valor };
      return copia;
    });
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
        <div className="space-y-3">
          {resultadosBusqueda.length === 0 ? (
            <div className="rounded-xl border border-vino-100 bg-white p-4">
              <p className="text-sm text-tinta/60">Nadie con ese nombre o cédula tiene plan con nosotros.</p>
            </div>
          ) : (
            resultadosBusqueda.map(({ persona, afiliado }) => (
              <div key={persona.id} className="rounded-xl border border-vino-100 bg-white p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-display text-base text-vino-900">{afiliado.nombreCompleto}</p>
                  <span className="rounded-full bg-vino-50 px-2.5 py-1 text-xs text-vino-700">
                    {persona.esTitular ? "Titular" : `Encontrado como beneficiario (${persona.parentesco})`}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-tinta/70 sm:grid-cols-3">
                  <p>Cédula titular: <span className="text-tinta">{afiliado.cedula}</span></p>
                  <p>Plan: <span className="text-tinta">{mapaPlanes[afiliado.planId] ?? afiliado.planId}</span></p>
                  <p>N° Contrato: <span className="text-tinta">{afiliado.numeroContrato}</span></p>
                  <p>Estado: <span className="text-tinta">{afiliado.estadoPlan}</span></p>
                  <p>Beneficiarios: <span className="text-tinta">{afiliado.beneficiarios?.length ?? 0}</span></p>
                  <p>Sede: <span className="text-tinta">{afiliado.sede}</span></p>
                </div>
              </div>
            ))
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
              {planes.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre} — {formatoPesos(p.valorMensual)}/mes</option>
              ))}
            </select>
            <input name="numeroContrato" required placeholder="Número de contrato" className="rounded-lg border border-vino-100 px-3 py-2 text-sm" />
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
          <div className="space-y-2">
            <p className="text-sm font-medium text-vino-900">Beneficiarios (opcional)</p>
            {beneficiariosNuevo.map((b, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_1fr_2rem] gap-2">
                <input placeholder="Nombre" value={b.nombre} onChange={(e) => actualizarBeneficiarioNuevo(i, "nombre", e.target.value)} className="rounded-lg border border-vino-100 px-2 py-1.5 text-sm" />
                <input placeholder="Parentesco" value={b.parentesco} onChange={(e) => actualizarBeneficiarioNuevo(i, "parentesco", e.target.value)} className="rounded-lg border border-vino-100 px-2 py-1.5 text-sm" />
                <input placeholder="Cédula" value={b.cedula} onChange={(e) => actualizarBeneficiarioNuevo(i, "cedula", e.target.value)} className="rounded-lg border border-vino-100 px-2 py-1.5 text-sm" />
                <button type="button" onClick={() => setBeneficiariosNuevo((prev) => prev.filter((_, idx) => idx !== i))} className="text-tinta/40 hover:text-red-600">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setBeneficiariosNuevo((prev) => [...prev, { nombre: "", parentesco: "", cedula: "" }])}
              className="flex items-center gap-1.5 text-sm text-vino-700 hover:underline"
            >
              <Plus size={14} /> Agregar beneficiario
            </button>
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
          { encabezado: "Plan", render: (a: Afiliado) => mapaPlanes[a.planId] ?? a.planId },
          { encabezado: "N° Contrato", render: (a: Afiliado) => a.numeroContrato },
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
          {
            encabezado: "Beneficiarios",
            render: (a: Afiliado) => (
              <button onClick={() => setAfiliadoBeneficiarios(a)} className="flex items-center gap-1 text-vino-700 hover:underline">
                <Users size={14} /> {a.beneficiarios?.length ?? 0}
              </button>
            ),
          },
          {
            encabezado: "Acciones",
            render: (a: Afiliado) => (
              <div className="flex gap-2">
                <button onClick={() => setAfiliadoEditando(a)} className="text-vino-700 hover:underline"><Pencil size={14} /></button>
                {rol === "admin" && (
                  <button onClick={() => manejarEliminarAfiliado(a)} className="text-red-600 hover:underline"><Trash2 size={14} /></button>
                )}
              </div>
            ),
          },
          {
            encabezado: "Pagos",
            render: (a: Afiliado) => (
              <button onClick={() => setAfiliadoPagos(a)} className="flex items-center gap-1 text-vino-700 hover:underline">
                <Receipt size={14} /> Ver
              </button>
            ),
          },
          {
            encabezado: "Servicios",
            render: (a: Afiliado) => (
              <button onClick={() => setAfiliadoServicios(a)} className="flex items-center gap-1 text-vino-700 hover:underline">
                <ClipboardList size={14} /> Ver
              </button>
            ),
          },
        ]}
        filas={afiliados}
        cargando={cargando}
        claveFila={(a) => a.id}
        vacioTitulo="Todavía no hay afiliados registrados"
        vacioDescripcion='Usa "Nuevo afiliado" para agregar el primero.'
      />
      {afiliadoServicios && <PanelHistorialServicios afiliado={afiliadoServicios} onCerrar={() => setAfiliadoServicios(null)} />}
      {afiliadoEditando && <PanelEditarAfiliado afiliado={afiliadoEditando} planes={planes} onCerrar={() => setAfiliadoEditando(null)} />}
      {afiliadoBeneficiarios && <PanelBeneficiarios afiliado={afiliadoBeneficiarios} onCerrar={() => setAfiliadoBeneficiarios(null)} />}
      {afiliadoPagos && <PanelPagos afiliado={afiliadoPagos} onCerrar={() => setAfiliadoPagos(null)} />}
    </div>
  );
}
