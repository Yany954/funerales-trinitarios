import { useEffect, useState, FormEvent } from "react";
import { useDialogo } from "../hooks/useDialogo";
import { useEstadoCarga, AvisoCarga } from "../hooks/useEstadoCarga";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { Pencil, Receipt, ShieldOff, X, Save, Plus, Trash2, Search, Smartphone, Wallet, ShieldCheck } from "lucide-react";
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
    return onSnapshot(
      query(collection(db, "planes_funerarios")),
      (snap) => {
        const mapa: Record<string, string> = {};
        snap.docs.forEach((d) => (mapa[d.id] = (d.data() as PlanFunerario).nombre));
        setMapaPlanes(mapa);
      },
      (err) => console.error("Error cargando planes:", err)
    );
  }, []);

  // Misma consulta que Afiliados (ya tiene índice); el filtro de seguro se hace aquí.
  useEffect(() => {
    if (cargandoRol) return;
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
  }, [sedeSeleccionada, cargandoRol, carga.intento]);

  if (cargandoRol) return <div className="py-16 text-center text-tinta/70">Cargando…</div>;

  const conteo = {
    activo: afiliados.filter((a) => a.seguroVida.estado === "activo").length,
    "en mora": afiliados.filter((a) => a.seguroVida.estado === "en mora").length,
  };
  const recaudoMensual = afiliados.reduce((t, a) => t + (a.seguroVida.precioMensual ?? 0), 0);
  const aseguradoTotal = afiliados.reduce((t, a) => t + (a.seguroVida.valorIndemnizacion ?? 0), 0);
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
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h2 className="font-display text-2xl text-vino-900">Seguros de vida</h2>
          <p className="mt-1 text-sm text-tinta/70">
            Titulares con seguro de vida. Si la persona tiene plan exequial, marca "Tiene seguro de vida" en Afiliados; si solo tiene seguro, usa el botón.
          </p>
        </div>
        <button
          onClick={() => setCreando(true)}
          className="flex min-h-[44px] items-center gap-2 rounded-lg bg-vino-700 px-4 text-sm font-medium text-white transition hover:bg-vino-600 active:translate-y-px"
        >
          <Plus size={16} aria-hidden="true" /> Nuevo titular de seguro
        </button>
      </header>

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

      <section aria-label="Resumen" className="space-y-4 rounded-2xl border border-vino-100 bg-white p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {([
            { valor: "activo", titulo: "Al día", punto: "bg-green-600", texto: "text-green-700" },
            { valor: "en mora", titulo: "En mora", punto: "bg-amber-500", texto: "text-amber-700" },
          ] as const).map((e) => {
            const activo = filtroEstado === e.valor;
            return (
              <button
                key={e.valor}
                onClick={() => setFiltroEstado(activo ? "todos" : e.valor)}
                aria-pressed={activo}
                className={`rounded-xl border p-4 text-left transition hover:shadow-md ${activo ? "border-vino-600 ring-2 ring-vino-100" : "border-vino-100"}`}
              >
                <p className="flex items-center gap-2 text-sm text-tinta/70">
                  <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${e.punto}`} /> {e.titulo}
                </p>
                <p className={`mt-1 font-display text-3xl tabular-nums ${e.texto}`}>{conteo[e.valor]}</p>
              </button>
            );
          })}
          <div className="rounded-xl border border-vino-100 p-4">
            <p className="flex items-center gap-2 text-sm text-tinta/70"><Wallet size={15} aria-hidden="true" /> Recaudo mensual</p>
            <p className="mt-1 font-display text-2xl tabular-nums text-vino-900">{formatoPesos(recaudoMensual)}</p>
          </div>
          <div className="rounded-xl border border-vino-100 p-4">
            <p className="flex items-center gap-2 text-sm text-tinta/70"><ShieldCheck size={15} aria-hidden="true" /> Valor asegurado total</p>
            <p className="mt-1 font-display text-2xl tabular-nums text-vino-900">{formatoPesos(aseguradoTotal)}</p>
          </div>
        </div>
        {afiliados.length > 0 && (
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-vino-50" role="img" aria-label={`${conteo.activo} al día, ${conteo["en mora"]} en mora`}>
            <div className="bg-green-600" style={{ width: `${(conteo.activo / afiliados.length) * 100}%` }} />
            <div className="bg-amber-500" style={{ width: `${(conteo["en mora"] / afiliados.length) * 100}%` }} />
          </div>
        )}
        <p className="text-xs text-tinta/70">
          {afiliados.length} {afiliados.length === 1 ? "titular" : "titulares"}.{" "}
          {filtroEstado === "todos" ? "Toca una cifra para ver solo ese grupo." : "Toca la cifra otra vez para ver todos."}
        </p>
      </section>

      <AvisoCarga carga={carga} />
      <DataTable
        columnas={[
          {
            encabezado: "Titular",
            orden: (a: ConSeguro) => a.nombreCompleto,
            render: (a: ConSeguro) => (
              <div className="min-w-[12rem] max-w-[17rem]">
                <p className="font-semibold text-tinta">{a.nombreCompleto}</p>
                <p className="text-xs text-tinta/60">{[a.cedula ? `C.C. ${a.cedula}` : "Sin cédula", nombrePlan(a)].filter(Boolean).join(" · ")}</p>
              </div>
            ),
          },
          {
            encabezado: "Cuota y valor asegurado",
            orden: (a: ConSeguro) => a.seguroVida.precioMensual,
            render: (a: ConSeguro) => (
              <div className="whitespace-nowrap">
                <p className="font-medium tabular-nums text-vino-700">{formatoPesos(a.seguroVida.precioMensual)} / mes</p>
                <p className="text-xs tabular-nums text-tinta/60">Asegurado {formatoPesos(a.seguroVida.valorIndemnizacion)}</p>
              </div>
            ),
          },
          {
            encabezado: "Vigencia",
            orden: (a: ConSeguro) => aMilisegundos(a.seguroVida.fechaInicio),
            render: (a: ConSeguro) => (
              <div>
                <p className="tabular-nums text-tinta">Desde {formatoFecha(a.seguroVida.fechaInicio)}</p>
                <p className="text-xs text-tinta/60">{ubicacionDe(a) || a.sede}</p>
              </div>
            ),
          },
          {
            encabezado: "Estado",
            orden: (a: ConSeguro) => a.seguroVida.estado,
            render: (a: ConSeguro) => (
              <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${a.seguroVida.estado === "activo" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-800"}`}>
                <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${a.seguroVida.estado === "activo" ? "bg-green-600" : "bg-amber-500"}`} />
                {a.seguroVida.estado === "activo" ? "al día" : "en mora"}
              </span>
            ),
          },
          {
            encabezado: "Beneficiarios",
            render: (a: ConSeguro) => (
              <div className="flex max-w-[16rem] flex-wrap gap-1">
                {beneficiariosDelSeguro(a.seguroVida).map((b, i) => (
                  <span
                    key={i}
                    title={[b.nombre, b.parentesco, b.edad != null ? `${b.edad} años` : null, b.cedula ? `C.C. ${b.cedula}` : null].filter(Boolean).join(" · ")}
                    className="inline-flex items-center gap-1 rounded-full bg-vino-50 px-2 py-0.5 text-xs text-tinta"
                  >
                    {b.nombre.split(" ")[0]} <span className="font-semibold text-vino-700">{b.porcentaje}%</span>
                  </span>
                ))}
              </div>
            ),
          },
          {
            encabezado: "Acciones",
            render: (a: ConSeguro) => (
              <div className="flex items-center gap-0.5">
                <button aria-label="Editar seguro" title="Editar seguro" onClick={() => setEditando(a)} className="rounded-lg p-1.5 text-vino-700 hover:bg-vino-50"><Pencil size={16} aria-hidden="true" /></button>
                <button aria-label="Pagos del seguro" title="Pagos del seguro" onClick={() => setPagosDe(a)} className="rounded-lg p-1.5 text-vino-700 hover:bg-vino-50"><Receipt size={16} aria-hidden="true" /></button>
                <button aria-label="Acceso a la app" title="Acceso a la app" onClick={() => setAccesoAppDe(a)} className="rounded-lg p-1.5 text-vino-700 hover:bg-vino-50"><Smartphone size={16} aria-hidden="true" /></button>
                {a.soloSeguro ? (
                  rol === "admin" && (
                    <button aria-label="Eliminar titular" title="Eliminar titular" onClick={() => eliminarTitular(a)} className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"><Trash2 size={16} aria-hidden="true" /></button>
                  )
                ) : (
                  <button aria-label="Quitar seguro" title="Quitar seguro" onClick={() => quitarSeguro(a)} className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"><ShieldOff size={16} aria-hidden="true" /></button>
                )}
              </div>
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
