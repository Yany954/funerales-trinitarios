import { useEffect, useState, FormEvent } from "react";
import { useDialogo } from "../hooks/useDialogo";
import { useEstadoCarga, AvisoCarga } from "../hooks/useEstadoCarga";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { Pencil, Receipt, ShieldOff, X, Save, Plus, Trash2, Search, Smartphone } from "lucide-react";
import PanelAccesoApp from "../components/PanelAccesoApp";
import { db, actualizarAfiliado, guardarSeguroVida, crearTitularSeguro, eliminarAfiliado } from "../api/client";
import DataTable from "../components/DataTable";
import PanelPagos from "../components/PanelPagos";
import CamposSeguroVida, { leerSeguroDeForm } from "../components/CamposSeguroVida";
import { useRol } from "../auth/RolContext";
import { aMilisegundos, formatoFecha, formatoPesos } from "../utils/formato";
import { confirmarAccion, confirmarEliminar } from "../utils/confirmar";
import { normalizarCedula } from "../utils/cedula";
import { beneficiariosDelSeguro, ubicacionDe, UBICACIONES_POR_SEDE, EDAD_MAXIMA_TITULAR_SEGURO } from "../types";
import type { Afiliado, PlanFunerario, SeguroVida, Sede } from "../types";

const SEDES: Sede[] = ["Pailitas", "Tamalameque", "Pelaya", "Curumaní"];
/** Minúsculas y sin tildes, para comparar nombres. */
function normalizarTexto(t: string | undefined): string {
  return (t ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

/** ¿El titular o alguno de sus beneficiarios del seguro coincide con lo buscado (nombre o cédula)? */
function coincide(a: ConSeguro, termino: string): boolean {
  const texto = normalizarTexto(termino);
  if (!texto) return true;
  const cedula = normalizarCedula(termino);
  const personas = [{ nombre: a.nombreCompleto, cedula: a.cedula }, ...beneficiariosDelSeguro(a.seguroVida)];
  return personas.some(
    (p) =>
      normalizarTexto(p.nombre).includes(texto) ||
      (cedula.length > 0 && normalizarCedula(p.cedula).includes(cedula))
  );
}

function aInputDate(valor: unknown): string {
  if (!valor) return "";
  const conToDate = valor as { toDate?: () => Date };
  const fecha = conToDate.toDate ? conToDate.toDate() : new Date(valor as string);
  return isNaN(fecha.getTime()) ? "" : fecha.toISOString().slice(0, 10);
}

const clase = "w-full rounded-lg border border-vino-100 px-3 py-2 text-sm disabled:bg-vino-50";

/** Afiliado que sí tiene los datos del seguro cargados. */
type ConSeguro = Afiliado & { seguroVida: SeguroVida };

export default function SegurosVida() {
  const { rol, sedeAsignada, sedeSeleccionada, cargando: cargandoRol } = useRol();
  const [creando, setCreando] = useState(false);
  const [termino, setTermino] = useState("");
  const [afiliados, setAfiliados] = useState<ConSeguro[]>([]);
  const carga = useEstadoCarga();
  const { cargando } = carga;
  const [mapaPlanes, setMapaPlanes] = useState<Record<string, string>>({});
  const [filtroEstado, setFiltroEstado] = useState<"todos" | SeguroVida["estado"]>("todos");
  const [editando, setEditando] = useState<ConSeguro | null>(null);
  const [pagosDe, setPagosDe] = useState<ConSeguro | null>(null);
  const [accesoAppDe, setAccesoAppDe] = useState<ConSeguro | null>(null);

  useEffect(() => {
    return onSnapshot(query(collection(db, "planes_funerarios")), (snap) => {
      const mapa: Record<string, string> = {};
      snap.docs.forEach((d) => (mapa[d.id] = (d.data() as PlanFunerario).nombre));
      setMapaPlanes(mapa);
    });
  }, []);

  // Misma consulta que Afiliados (ya tiene índice); el filtro de seguro se hace aquí.
  useEffect(() => {
    const base = collection(db, "afiliados");
    const q = sedeSeleccionada === "all"
      ? query(base, orderBy("nombreCompleto"))
      : query(base, where("sede", "==", sedeSeleccionada), orderBy("nombreCompleto"));
    return onSnapshot(
      q,
      (snap) => {
        const todos = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Afiliado));
        setAfiliados(todos.filter((a): a is ConSeguro => a.tieneSeguroVida && !!a.seguroVida));
        carga.listo();
      },
      (err) => carga.fallo(err)
    );
  }, [sedeSeleccionada, carga.intento]);

  if (cargandoRol) return <div className="py-16 text-center text-tinta/70">Cargando…</div>;

  const conteo = {
    activo: afiliados.filter((a) => a.seguroVida.estado === "activo").length,
    "en mora": afiliados.filter((a) => a.seguroVida.estado === "en mora").length,
  };
  const nombrePlan = (a: ConSeguro) => (a.soloSeguro ? "Solo seguro de vida" : mapaPlanes[a.planId] ?? a.planId);
  const filtrados = afiliados.filter(
    (a) => (filtroEstado === "todos" || a.seguroVida.estado === filtroEstado) && coincide(a, termino)
  );

  async function quitarSeguro(a: ConSeguro) {
    const ok = await confirmarAccion(
      "¿Quitar el seguro de vida?",
      `${a.nombreCompleto} dejará de aparecer en esta página. Sus pagos del seguro se conservan.`,
      "Sí, quitar"
    );
    if (!ok) return;
    try {
      await actualizarAfiliado({ id: a.id, tieneSeguroVida: false });
    } catch (err) {
      console.error("Error quitando seguro:", err);
    }
  }

  async function eliminarTitular(a: ConSeguro) {
    if (!(await confirmarEliminar(a.nombreCompleto))) return;
    try {
      await eliminarAfiliado(a.id);
    } catch (err) {
      console.error("Error eliminando titular del seguro:", err);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg text-vino-900">Titulares con seguro de vida</h2>
          <p className="text-sm text-tinta/70">
            Si la persona tiene plan exequial, marca "Tiene seguro de vida" en la página Afiliados. Si solo tiene seguro, usa el botón.
          </p>
        </div>
        <button
          onClick={() => setCreando(true)}
          className="flex items-center gap-2 rounded-lg bg-vino-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-vino-600"
        >
          <Plus size={16} /> Nuevo titular de seguro
        </button>
      </div>

      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-tinta/70" />
        <input
          value={termino}
          onChange={(e) => setTermino(e.target.value)}
          placeholder="Buscar por nombre o cédula (titular o beneficiario)…" aria-label="Buscar por nombre o cédula (titular o beneficiario)"
          className="w-full rounded-lg border border-vino-100 bg-white py-2.5 pl-10 pr-9 text-sm outline-none focus:border-vino-400"
        />
        {termino && (
          <button onClick={() => setTermino("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-tinta/70 hover:text-tinta" title="Limpiar búsqueda">
            <X size={16} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {(["activo", "en mora"] as const).map((estado) => (
          <div key={estado} className="rounded-xl border border-vino-100 bg-white p-4 text-center">
            <p className="text-xs capitalize text-tinta/70">{estado}</p>
            <p className="font-display text-xl text-vino-900">{conteo[estado]}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {([
          { valor: "todos", etiqueta: "Todos" },
          { valor: "activo", etiqueta: "Activos" },
          { valor: "en mora", etiqueta: "En mora" },
        ] as const).map((p) => (
          <button
            key={p.valor}
            onClick={() => setFiltroEstado(p.valor)}
            className={`rounded-full px-3.5 py-1.5 text-sm ${filtroEstado === p.valor ? "bg-vino-700 text-white" : "border border-vino-100 bg-white text-tinta/70"}`}
          >
            {p.etiqueta}
          </button>
        ))}
      </div>

      <AvisoCarga carga={carga} />
      <DataTable
        columnas={[
          { encabezado: "Nombre", render: (a: ConSeguro) => a.nombreCompleto, orden: (a: ConSeguro) => a.nombreCompleto },
          { encabezado: "Cédula", render: (a: ConSeguro) => a.cedula || "—" },
          { encabezado: "Plan", render: (a: ConSeguro) => nombrePlan(a), orden: (a: ConSeguro) => nombrePlan(a) },
          {
            encabezado: "Inicio vigencia",
            render: (a: ConSeguro) => formatoFecha(a.seguroVida.fechaInicio),
            orden: (a: ConSeguro) => aMilisegundos(a.seguroVida.fechaInicio),
          },
          { encabezado: "Cuota", render: (a: ConSeguro) => formatoPesos(a.seguroVida.precioMensual), orden: (a: ConSeguro) => a.seguroVida.precioMensual },
          {
            encabezado: "Indemnización",
            render: (a: ConSeguro) => formatoPesos(a.seguroVida.valorIndemnizacion),
            orden: (a: ConSeguro) => a.seguroVida.valorIndemnizacion,
          },
          { encabezado: "Ubicación", render: (a: ConSeguro) => ubicacionDe(a), orden: (a: ConSeguro) => ubicacionDe(a) },
          {
            encabezado: "Estado",
            render: (a: ConSeguro) => (
              <span className={`rounded-full px-2.5 py-1 text-xs ${a.seguroVida.estado === "activo" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
                {a.seguroVida.estado}
              </span>
            ),
          },
          {
            encabezado: "Beneficiarios",
            render: (a: ConSeguro) => (
              <div className="space-y-1">
                {beneficiariosDelSeguro(a.seguroVida).map((b, i) => (
                  <span key={i} className="block">
                    {b.nombre} <span className="font-medium text-vino-700">· {b.porcentaje} %</span>
                    <span className="block text-xs text-tinta/70">
                      {[b.parentesco, b.edad != null ? `${b.edad} años` : null, b.cedula ? `C.C. ${b.cedula}` : null].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                ))}
              </div>
            ),
          },
          {
            encabezado: "Acciones",
            render: (a: ConSeguro) => (
              <div className="flex gap-2">
                <button aria-label="Editar seguro" onClick={() => setEditando(a)} className="text-vino-700 hover:underline" title="Editar seguro"><Pencil size={14} aria-hidden="true" /></button>
                <button aria-label="Acceso a la app" title="Acceso a la app" onClick={() => setAccesoAppDe(a)} className="text-vino-700 hover:underline"><Smartphone size={14} aria-hidden="true" /></button>
                {a.soloSeguro ? (
                  rol === "admin" && (
                    <button aria-label="Eliminar titular" onClick={() => eliminarTitular(a)} className="text-red-600 hover:underline" title="Eliminar titular"><Trash2 size={14} aria-hidden="true" /></button>
                  )
                ) : (
                  <button aria-label="Quitar seguro" onClick={() => quitarSeguro(a)} className="text-red-600 hover:underline" title="Quitar seguro"><ShieldOff size={14} aria-hidden="true" /></button>
                )}
              </div>
            ),
          },
          {
            encabezado: "Pagos",
            render: (a: ConSeguro) => (
              <button onClick={() => setPagosDe(a)} className="flex items-center gap-1 text-vino-700 hover:underline">
                <Receipt size={14} /> Ver
              </button>
            ),
          },
        ]}
        filas={filtrados}
        cargando={cargando}
        claveFila={(a) => a.id}
        vacioTitulo={termino ? "No se encontró a nadie" : "No hay titulares con seguro de vida"}
        vacioDescripcion={termino ? "Revisa el nombre o la cédula que escribiste." : 'Usa "Nuevo titular de seguro" o marca "Tiene seguro de vida" en un afiliado.'}
      />

      {editando && <PanelEditarSeguro afiliado={editando} onCerrar={() => setEditando(null)} />}
      {creando && (
        <PanelNuevoTitular
          sedeFija={rol === "admin" ? undefined : (sedeAsignada as Sede | undefined)}
          onCerrar={() => setCreando(false)}
        />
      )}
      {pagosDe && <PanelPagos afiliado={pagosDe} tipo="seguro" onCerrar={() => setPagosDe(null)} />}
      {accesoAppDe && <PanelAccesoApp afiliado={accesoAppDe} onCerrar={() => setAccesoAppDe(null)} />}
    </div>
  );
}

function PanelEditarSeguro({ afiliado, onCerrar }: { afiliado: ConSeguro; onCerrar: () => void }) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function manejarGuardar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    const form = new FormData(e.currentTarget);
    try {
      const seguro = leerSeguroDeForm(form, false);
      if (afiliado.soloSeguro) {
        await actualizarAfiliado({
          id: afiliado.id,
          nombreCompleto: String(form.get("nombreCompleto") ?? "").trim(),
          cedula: String(form.get("cedula") ?? "").trim(),
          fechaNacimiento: String(form.get("fechaNacimiento") || "") || undefined,
          ubicacion: String(form.get("ubicacion") || ""), // "" = la misma sede
        });
      }
      await guardarSeguroVida({ afiliadoId: afiliado.id, ...seguro });
      onCerrar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  }

  const refDialogo = useDialogo(onCerrar);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-tinta/40 p-4">
      <div ref={refDialogo} role="dialog" aria-modal="true" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg text-vino-900">Editar seguro — {afiliado.nombreCompleto}</h3>
            <p className="text-xs text-tinta/70">Los pagos se registran con el botón "Ver" de la columna Pagos.</p>
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="rounded-lg p-1 text-tinta/70 hover:text-tinta"><X size={20} aria-hidden="true" /></button>
        </div>
        <form onSubmit={manejarGuardar} className="space-y-3">
          {afiliado.soloSeguro && (
            <CamposTitular
              sede={afiliado.sede}
              nombre={afiliado.nombreCompleto}
              cedula={afiliado.cedula}
              ubicacion={afiliado.ubicacion ?? afiliado.vereda ?? ""}
              fechaNacimiento={afiliado.fechaNacimiento}
            />
          )}
          <CamposSeguroVida conPrimerPago={false} valorInicial={afiliado.seguroVida} />
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={guardando} className="flex w-full items-center justify-center gap-2 rounded-lg bg-vino-700 py-2.5 text-sm font-medium text-white hover:bg-vino-600 disabled:opacity-60">
            <Save size={16} />
            {guardando ? "Guardando…" : "Guardar cambios"}
          </button>
        </form>
      </div>
    </div>
  );
}

/** Nombre, cédula y ubicación del titular que solo tiene seguro de vida. */
function CamposTitular({
  sede,
  nombre,
  cedula,
  ubicacion,
  fechaNacimiento,
}: {
  sede: string;
  nombre?: string;
  cedula?: string;
  ubicacion?: string;
  fechaNacimiento?: unknown;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <input name="nombreCompleto" required defaultValue={nombre} placeholder="Nombre del titular" aria-label="Nombre del titular" className={`${clase} sm:col-span-2`} />
      <input name="cedula" defaultValue={cedula} placeholder="Cédula (opcional)" aria-label="Cédula (opcional)" className={clase} />
      <div className="sm:col-span-2">
        <label className="mb-1 block text-xs text-tinta/70">
          Fecha de nacimiento del titular (opcional; el seguro se toma hasta los {EDAD_MAXIMA_TITULAR_SEGURO} años)
        </label>
        <input name="fechaNacimiento" type="date" min="1900-01-01" max="2100-12-31" defaultValue={aInputDate(fechaNacimiento)} className={clase} />
      </div>
      <select key={sede} name="ubicacion" defaultValue={ubicacion ?? ""} disabled={!sede} className={clase}>
        <option value="">{sede ? `Ubicación: ${sede} (por defecto)` : "Ubicación… (elige la sede)"}</option>
        {(UBICACIONES_POR_SEDE[sede] ?? []).map((v) => (
          <option key={v} value={v}>{v}</option>
        ))}
      </select>
    </div>
  );
}

/** Crea un titular que solo tiene seguro de vida (sin plan exequial). */
function PanelNuevoTitular({ sedeFija, onCerrar }: { sedeFija?: Sede; onCerrar: () => void }) {
  const [sede, setSede] = useState<string>(sedeFija ?? "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function manejarGuardar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    setGuardando(true);
    try {
      await crearTitularSeguro({
        nombreCompleto: String(form.get("nombreCompleto") ?? "").trim(),
        cedula: String(form.get("cedula") ?? "").trim() || undefined,
        fechaNacimiento: String(form.get("fechaNacimiento") || "") || undefined,
        sede: sede as Sede,
        ubicacion: String(form.get("ubicacion") || "") || undefined,
        seguroVida: leerSeguroDeForm(form, true),
      });
      onCerrar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  }

  const refDialogo = useDialogo(onCerrar);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-tinta/40 p-4">
      <div ref={refDialogo} role="dialog" aria-modal="true" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg text-vino-900">Nuevo titular de seguro de vida</h3>
            <p className="text-xs text-tinta/70">Para personas que tienen seguro de vida pero no plan exequial.</p>
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="rounded-lg p-1 text-tinta/70 hover:text-tinta"><X size={20} aria-hidden="true" /></button>
        </div>
        <form onSubmit={manejarGuardar} className="space-y-3">
          {!sedeFija && (
            <select aria-label="Sede" required value={sede} onChange={(e) => setSede(e.target.value)} className={clase}>
              <option value="">Sede…</option>
              {SEDES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}
          <CamposTitular sede={sede} />
          <CamposSeguroVida conPrimerPago />
          <p className="text-xs text-tinta/70">
            El estado (activo / en mora) se calcula solo con los pagos. Al guardar se registra el primer pago con la fecha de inicio de vigencia.
          </p>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={guardando} className="flex w-full items-center justify-center gap-2 rounded-lg bg-vino-700 py-2.5 text-sm font-medium text-white hover:bg-vino-600 disabled:opacity-60">
            <Save size={16} />
            {guardando ? "Guardando…" : "Crear titular"}
          </button>
        </form>
      </div>
    </div>
  );
}
