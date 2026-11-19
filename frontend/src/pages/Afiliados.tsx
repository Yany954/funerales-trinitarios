import { useEffect, useState, FormEvent } from "react";
import { useEstadoCarga, AvisoCarga } from "../hooks/useEstadoCarga";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { Plus, Search, Trash2, UserPlus, Pencil, ClipboardList, Smartphone } from "lucide-react";
import Modal from "../components/Modal";
import PanelAccesoApp from "../components/PanelAccesoApp";
import { db, crearAfiliado, buscarPersonaCubierta } from "../api/client";
import DataTable from "../components/DataTable";
import type { Afiliado, BeneficiarioEntrada, PersonaCubierta, PlanFunerario, ResultadoBusquedaAfiliado, Sede } from "../types";
import { useRol } from "../auth/RolContext";
import PanelPagos from "../components/PanelPagos";
import { Receipt } from "lucide-react";
import { aMilisegundos, calcularEdad, formatoFecha, formatoPesos } from "../utils/formato";
import PanelBeneficiarios from "../components/PanelBeneficiarios";
import { Users } from "lucide-react";
import PanelEditarAfiliado from "../components/PanelEditarAfiliado";
import { eliminarAfiliado } from "../api/client";
import { confirmarEliminar } from "../utils/confirmar";
import PanelHistorialServicios from "../components/PanelHistorialServicios";
import CampoPrecio from "../components/CampoPrecio";
import { UBICACIONES_POR_SEDE, ubicacionDe } from "../types";
import { PARENTESCOS } from "../utils/parentescos";
import { limiteBeneficiariosDelPlan, VALOR_BENEFICIARIO_ADICIONAL } from "../utils/cupoBeneficiarios";
import { normalizarCedula } from "../utils/cedula";
import CamposSeguroVida, { leerSeguroDeForm } from "../components/CamposSeguroVida";

const ESTADOS_AFILIADO: { valor: Afiliado["estadoPlan"]; titulo: string; punto: string; texto: string; chip: string }[] = [
  { valor: "activo", titulo: "Activos (al día)", punto: "bg-green-600", texto: "text-green-700", chip: "bg-green-50 text-green-700" },
  { valor: "en mora", titulo: "En mora", punto: "bg-amber-500", texto: "text-amber-700", chip: "bg-amber-50 text-amber-800" },
  { valor: "inactivo", titulo: "Inactivos", punto: "bg-tinta/30", texto: "text-tinta/70", chip: "bg-tinta/5 text-tinta/70" },
];

/** Botón de ícono para las acciones de cada fila (con nombre al pasar el mouse). */
function BotonAccion({ etiqueta, onClick, peligro, children }: { etiqueta: string; onClick: () => void; peligro?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={etiqueta}
      aria-label={etiqueta}
      className={`rounded-lg p-1.5 transition ${peligro ? "text-red-600 hover:bg-red-50" : "text-vino-700 hover:bg-vino-50"}`}
    >
      {children}
    </button>
  );
}

export default function Afiliados() {
  const [afiliados, setAfiliados] = useState<Afiliado[]>([]);
  const carga = useEstadoCarga();
  const { cargando } = carga;

  const [termino, setTermino] = useState("");
  const [buscando, setBuscando] = useState(false);

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { rol, sedeAsignada, sedeSeleccionada, cargando: cargandoRol } = useRol();
  const [planes, setPlanes] = useState<PlanFunerario[]>([]);
  const [mapaPlanes, setMapaPlanes] = useState<Record<string, string>>({});
  const [afiliadoPagos, setAfiliadoPagos] = useState<Afiliado | null>(null);
  const [beneficiariosNuevo, setBeneficiariosNuevo] = useState<BeneficiarioEntrada[]>([]);
  const [afiliadoBeneficiarios, setAfiliadoBeneficiarios] = useState<Afiliado | null>(null);
  const [resultadosBusqueda, setResultadosBusqueda] = useState<ResultadoBusquedaAfiliado[] | null>(null);
  const [afiliadoEditando, setAfiliadoEditando] = useState<Afiliado | null>(null);
  const [afiliadoServicios, setAfiliadoServicios] = useState<Afiliado | null>(null);
  const [afiliadoAccesoApp, setAfiliadoAccesoApp] = useState<Afiliado | null>(null);
  const [sedeForm, setSedeForm] = useState<string>("");
  const [planForm, setPlanForm] = useState<string>("");
  const [conSeguroForm, setConSeguroForm] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState<"todos" | Afiliado["estadoPlan"]>("todos");

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
    if (cargandoRol) return; // sin el rol todavía, un empleado consultaría una sede que no es la suya
    const base = collection(db, "afiliados");
    const q = sedeSeleccionada === "all"
      ? query(base, orderBy("nombreCompleto"))
      : query(base, where("sede", "==", sedeSeleccionada), orderBy("nombreCompleto"));
    const unsub = onSnapshot(q, (snap) => {
      // Los titulares que solo tienen seguro de vida se manejan en la página Seguros de vida.
      setAfiliados(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Afiliado)).filter((a) => !a.soloSeguro));
      carga.listo();
    }, (err) => carga.fallo(err));
    return unsub;
  }, [sedeSeleccionada, cargandoRol, carga.intento]);

  if (cargandoRol) return <div className="py-16 text-center text-tinta/70">Cargando…</div>;
  const conteo = {
    activo: afiliados.filter((a) => a.estadoPlan === "activo").length,
    "en mora": afiliados.filter((a) => a.estadoPlan === "en mora").length,
    inactivo: afiliados.filter((a) => a.estadoPlan === "inactivo").length,
  };
  const limitePlan = (planId: string, sede: string | undefined) => limiteBeneficiariosDelPlan(planes.find((p) => p.id === planId)?.nombre, sede);
  const limiteNuevo = limitePlan(planForm, rol === "admin" ? sedeForm : sedeAsignada ?? undefined);
  const adicionalesNuevos = beneficiariosNuevo.filter((b, i) => i >= limiteNuevo && b.adicional && b.nombre.trim()).length;
  const afiliadosFiltrados = filtroEstado === "todos" ? afiliados : afiliados.filter((a) => a.estadoPlan === filtroEstado);

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
    // Del 8° en adelante solo entran si se marcó el pago adicional.
    const beneficiarios = beneficiariosNuevo
      .map((b, i) => ({ ...b, adicional: i >= limiteNuevo ? !!b.adicional : undefined }))
      .filter((b) => b.nombre.trim());
    if (beneficiarios.some((b) => b.adicional === false)) {
      setError(`Para agregar más de ${limiteNuevo} beneficiarios marca el pago de ${formatoPesos(VALOR_BENEFICIARIO_ADICIONAL)}/mes en cada adicional.`);
      setGuardando(false);
      return;
    }
    try {
      await crearAfiliado({
        nombreCompleto: String(form.get("nombreCompleto")),
        cedula: String(form.get("cedula") ?? "").trim(),
        numeroContrato: String(form.get("numeroContrato")),
        planId: String(form.get("planId")),
        sede: (rol === "admin" ? String(form.get("sede")) : sedeAsignada) as Sede,
        fechaAfiliacionReal: String(form.get("fechaAfiliacionReal")),
        valorCuotaMensual: Number(form.get("valorCuotaMensual")),
        fechaNacimiento: String(form.get("fechaNacimiento") || "") || undefined,
        ubicacion: String(form.get("ubicacion") || "") || undefined,
        beneficiarios,
        tieneSeguroVida: conSeguroForm,
        seguroVida: conSeguroForm ? leerSeguroDeForm(form, true) : undefined,
      });
      setMostrarFormulario(false);
      setBeneficiariosNuevo([]);
      setPlanForm("");
      setConSeguroForm(false);
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el afiliado.");
    } finally {
      setGuardando(false);
    }
  }
  function actualizarBeneficiarioNuevo<K extends keyof BeneficiarioEntrada>(i: number, campo: K, valor: BeneficiarioEntrada[K]) {
    setBeneficiariosNuevo((prev) => {
      const copia = [...prev];
      copia[i] = { ...copia[i], [campo]: valor };
      return copia;
    });
  }
  function beneficiarioDe(afiliado: Afiliado, persona: PersonaCubierta) {
    return afiliado.beneficiarios?.find((b) =>
      persona.cedula ? normalizarCedula(b.cedula) === normalizarCedula(persona.cedula) : b.nombre === persona.nombreCompleto
    );
  }
  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h2 className="font-display text-2xl text-vino-900">Afiliados</h2>
          <p className="mt-1 text-sm text-tinta/70">
            Titulares con plan exequial. Busca a cualquier persona (titular o beneficiario) para saber si tiene plan con nosotros.
          </p>
        </div>
        <button
          onClick={() => setMostrarFormulario(true)}
          className="flex min-h-[44px] items-center gap-2 rounded-lg bg-vino-700 px-4 text-sm font-medium text-white transition hover:bg-vino-600 active:translate-y-px"
        >
          <UserPlus size={16} aria-hidden="true" /> Nuevo afiliado
        </button>
      </header>

      {/* Búsqueda rápida: "¿esta persona tiene plan?" — por titular o beneficiario */}
      <form onSubmit={manejarBusqueda} className="flex gap-2">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-tinta/70" />
          <input
            value={termino}
            onChange={(e) => setTermino(e.target.value)}
            placeholder="Buscar por nombre o cédula (titular o beneficiario)…" aria-label="Buscar por nombre o cédula (titular o beneficiario)"
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

      {buscando && <p className="text-sm text-tinta/70">Buscando…</p>}

      {resultadosBusqueda && !buscando && (
        <div className="space-y-3">
          {resultadosBusqueda.length === 0 ? (
            <div className="rounded-xl border border-vino-100 bg-white p-4">
              <p className="text-sm text-tinta/70">Nadie con ese nombre o cédula tiene plan con nosotros.</p>
            </div>
          ) : (
            resultadosBusqueda.map(({ persona, afiliado }) => (
              <div key={persona.id} className="rounded-xl border border-vino-100 bg-white p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-display text-base text-vino-900">{persona.nombreCompleto}</p>
                  <span className="rounded-full bg-vino-50 px-2.5 py-1 text-xs text-vino-700">
                    {persona.esTitular ? "Titular" : `Encontrado como beneficiario (${persona.parentesco})`}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-tinta/70 sm:grid-cols-3">
                  <p>Cédula: <span className="text-tinta">{persona.cedula || "—"}</span></p>
                  {!persona.esTitular && (
                    <p>Nacimiento: <span className="text-tinta">{formatoFecha(beneficiarioDe(afiliado, persona)?.fechaNacimiento)} ({calcularEdad(beneficiarioDe(afiliado, persona)?.fechaNacimiento) ?? "—"} años)</span></p>
                  )}
                  <p>Plan: <span className="text-tinta">{mapaPlanes[afiliado.planId] ?? afiliado.planId}</span></p>
                  <p>N° Contrato: <span className="text-tinta">{afiliado.numeroContrato}</span></p>
                  <p>Sede: <span className="text-tinta">{afiliado.sede}</span></p>
                  {persona.esTitular && (
                    <>
                      <p>Estado: <span className="text-tinta">{afiliado.estadoPlan}</span></p>
                      <p>Beneficiarios: <span className="text-tinta">{afiliado.beneficiarios?.length ?? 0}</span></p>
                      <p>Nacimiento: <span className="text-tinta">{formatoFecha(afiliado.fechaNacimiento)} ({calcularEdad(afiliado.fechaNacimiento) ?? "—"} años)</span></p>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Resumen: cada cifra es también un filtro de la tabla */}
      <section aria-label="Resumen por estado" className="space-y-4 rounded-2xl border border-vino-100 bg-white p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-display text-base text-vino-900">Todos los afiliados</h3>
          <p className="text-sm text-tinta/70">
            <span className="font-display text-2xl text-vino-900 tabular-nums">{afiliados.length}</span> en total
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {ESTADOS_AFILIADO.map((e) => {
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
        </div>
        {afiliados.length > 0 && (
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-vino-50" role="img" aria-label={`${conteo.activo} activos, ${conteo["en mora"]} en mora, ${conteo.inactivo} inactivos`}>
            {ESTADOS_AFILIADO.map((e) => (
              <div key={e.valor} className={e.punto} style={{ width: `${(conteo[e.valor] / afiliados.length) * 100}%` }} />
            ))}
          </div>
        )}
        <p className="text-xs text-tinta/70">
          {filtroEstado === "todos" ? "Toca una cifra para ver solo ese grupo." : `Mostrando solo "${ESTADOS_AFILIADO.find((x) => x.valor === filtroEstado)?.titulo.toLowerCase()}". Toca la cifra otra vez para ver todos.`}
        </p>
      </section>

      {mostrarFormulario && (
        <Modal titulo="Nuevo afiliado" onCerrar={() => { setMostrarFormulario(false); setError(null); }} ancho="max-w-3xl">
        <form onSubmit={manejarCrear} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <input name="nombreCompleto" required placeholder="Nombre completo" aria-label="Nombre completo" className="rounded-lg border border-vino-100 px-3 py-2 text-sm" />
            <input name="cedula" placeholder="Cédula (opcional)" aria-label="Cédula (opcional)" className="rounded-lg border border-vino-100 px-3 py-2 text-sm" />
            <select aria-label="Plan" name="planId" required value={planForm} onChange={(e) => setPlanForm(e.target.value)} className="rounded-lg border border-vino-100 px-3 py-2 text-sm">
              <option value="">Plan…</option>
              {planes.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
            <input
              name="fechaAfiliacionReal"
              type="date" min="1900-01-01" max="2100-12-31"
              required
              className="rounded-lg border border-vino-100 px-3 py-2 text-sm"
            />
            <label className="block text-xs text-tinta/70 sm:col-span-2">Fecha de nacimiento (titular, opcional)</label>
            <input name="fechaNacimiento" type="date" min="1900-01-01" max="2100-12-31" className="rounded-lg border border-vino-100 px-3 py-2 text-sm" />
            <CampoPrecio name="valorCuotaMensual" required placeholder="Cuota mensual que paga" />
            <input name="numeroContrato" required placeholder="Número de contrato" aria-label="Número de contrato" className="rounded-lg border border-vino-100 px-3 py-2 text-sm" />
            {rol === "admin" ? (
              <select aria-label="Sede"
                name="sede"
                required
                value={sedeForm}
                onChange={(e) => setSedeForm(e.target.value)}
                className="rounded-lg border border-vino-100 px-3 py-2 text-sm"
              >
                <option value="">Sede…</option>
                <option value="Pailitas">Pailitas</option>
                <option value="Tamalameque">Tamalameque</option>
                <option value="Pelaya">Pelaya</option>
                <option value="Curumaní">Curumaní</option>
              </select>
            ) : (
              <input type="hidden" name="sede" value={sedeAsignada ?? ""} />
            )}

            <select
              name="ubicacion"
              disabled={!(rol === "admin" ? sedeForm : sedeAsignada)}
              className="rounded-lg border border-vino-100 px-3 py-2 text-sm disabled:bg-vino-50"
            >
              <option value="">
                {(rol === "admin" ? sedeForm : sedeAsignada) ? `Ubicación: ${rol === "admin" ? sedeForm : sedeAsignada} (por defecto)` : "Ubicación…"}
              </option>
              {(UBICACIONES_POR_SEDE[rol === "admin" ? sedeForm : sedeAsignada ?? ""] ?? []).map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm text-tinta/70">
              <input type="checkbox" checked={conSeguroForm} onChange={(e) => setConSeguroForm(e.target.checked)} />
              Tiene seguro de vida
            </label>
          </div>
          {conSeguroForm && <CamposSeguroVida conPrimerPago />}
          <div className="space-y-2">
            <p className="text-sm font-medium text-vino-900">Beneficiarios (opcional)</p>
            {beneficiariosNuevo.map((b, i) => (
              <div key={i} className="grid grid-cols-2 gap-2 rounded-lg border border-vino-50 p-2 sm:grid-cols-[1fr_1fr_1fr_9rem_2rem] sm:border-0 sm:p-0">
                <input placeholder="Nombre" aria-label="Nombre" value={b.nombre} onChange={(e) => actualizarBeneficiarioNuevo(i, "nombre", e.target.value)} className="rounded-lg border border-vino-100 px-2 py-1.5 text-sm" />
                <select aria-label="Parentesco" value={b.parentesco} onChange={(e) => actualizarBeneficiarioNuevo(i, "parentesco", e.target.value)} className="rounded-lg border border-vino-100 px-2 py-1.5 text-sm">
                  <option value="">Parentesco…</option>
                  {PARENTESCOS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <input placeholder="Cédula" aria-label="Cédula" value={b.cedula} onChange={(e) => actualizarBeneficiarioNuevo(i, "cedula", e.target.value)} className="rounded-lg border border-vino-100 px-2 py-1.5 text-sm" />
                <input type="date" min="1900-01-01" max="2100-12-31" value={b.fechaNacimiento ?? ""} onChange={(e) => actualizarBeneficiarioNuevo(i, "fechaNacimiento", e.target.value)} className="rounded-lg border border-vino-100 px-2 py-1.5 text-sm" />
                <button aria-label="Eliminar" type="button" onClick={() => setBeneficiariosNuevo((prev) => prev.filter((_, idx) => idx !== i))} className="col-span-2 rounded-lg py-1.5 text-xs text-red-600 hover:bg-red-50 sm:col-span-1">
                  <Trash2 size={16} className="mx-auto" aria-hidden="true" />
                </button>
                {i >= limiteNuevo && (
                  <label className="col-span-2 flex items-center gap-2 text-xs text-amber-700 sm:col-span-5">
                    <input type="checkbox" checked={!!b.adicional} onChange={(e) => actualizarBeneficiarioNuevo(i, "adicional", e.target.checked)} />
                    Pagó {formatoPesos(VALOR_BENEFICIARIO_ADICIONAL)}/mes aparte del plan por adición de beneficiario
                  </label>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => setBeneficiariosNuevo((prev) => [...prev, { nombre: "", parentesco: "", cedula: "" }])}
              className="flex items-center gap-1.5 text-sm text-vino-700 hover:underline"
            >
              <Plus size={14} />{" "}
              {beneficiariosNuevo.length >= limiteNuevo
                ? `Agregar beneficiario adicional (+${formatoPesos(VALOR_BENEFICIARIO_ADICIONAL)}/mes)`
                : "Agregar beneficiario"}
            </button>
            {adicionalesNuevos > 0 && (
              <p className="text-xs text-tinta/70">
                Se sumarán {formatoPesos(adicionalesNuevos * VALOR_BENEFICIARIO_ADICIONAL)} a la cuota mensual por {adicionalesNuevos} beneficiario(s) adicional(es).
              </p>
            )}
          </div>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={guardando}
            className="rounded-lg bg-vino-700 px-4 py-2 text-sm font-medium text-white hover:bg-vino-600 disabled:opacity-60"
          >
            {guardando ? "Guardando…" : "Guardar afiliado"}
          </button>
        </form>
        </Modal>
      )}

      <AvisoCarga carga={carga} />
      <DataTable
        columnas={[
          {
            encabezado: "Afiliado",
            orden: (a: Afiliado) => a.nombreCompleto,
            render: (a: Afiliado) => (
              <div className="min-w-[12rem] max-w-[18rem]">
                <p className="font-semibold text-tinta">{a.nombreCompleto}</p>
                <p className="text-xs text-tinta/60">
                  {[a.cedula ? `C.C. ${a.cedula}` : "Sin cédula", a.numeroContrato ? `Contrato ${a.numeroContrato}` : "Sin contrato"].join(" · ")}
                </p>
              </div>
            ),
          },
          {
            encabezado: "Plan y cuota",
            orden: (a: Afiliado) => a.valorCuotaMensual,
            render: (a: Afiliado) => (
              <div>
                <p className="text-tinta">{mapaPlanes[a.planId] ?? a.planId}</p>
                <p className="text-xs font-medium tabular-nums text-vino-700">{formatoPesos(a.valorCuotaMensual)} / mes</p>
              </div>
            ),
          },
          {
            encabezado: "Desde",
            orden: (a: Afiliado) => aMilisegundos(a.fechaAfiliacionReal),
            render: (a: Afiliado) => (
              <div>
                <p className="tabular-nums text-tinta">{aMilisegundos(a.fechaAfiliacionReal) ? formatoFecha(a.fechaAfiliacionReal) : "—"}</p>
                <p className="text-xs text-tinta/60">{ubicacionDe(a) || a.sede}</p>
              </div>
            ),
          },
          {
            encabezado: "Estado",
            orden: (a: Afiliado) => a.estadoPlan,
            render: (a: Afiliado) => {
              const e = ESTADOS_AFILIADO.find((x) => x.valor === a.estadoPlan);
              return (
                <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium capitalize ${e?.chip ?? ""}`}>
                  <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${e?.punto ?? ""}`} />
                  {a.estadoPlan}
                </span>
              );
            },
          },
          {
            encabezado: "Beneficiarios",
            orden: (a: Afiliado) => a.beneficiarios?.length ?? 0,
            render: (a: Afiliado) => (
              <button onClick={() => setAfiliadoBeneficiarios(a)} className="inline-flex items-center gap-1.5 rounded-full bg-vino-50 px-2.5 py-1 text-xs font-medium text-vino-700 hover:bg-vino-100" title="Ver beneficiarios">
                <Users size={13} aria-hidden="true" /> {a.beneficiarios?.length ?? 0}
              </button>
            ),
          },
          {
            encabezado: "Acciones",
            render: (a: Afiliado) => (
              <div className="flex items-center gap-0.5">
                <BotonAccion etiqueta="Editar" onClick={() => setAfiliadoEditando(a)}><Pencil size={16} aria-hidden="true" /></BotonAccion>
                <BotonAccion etiqueta="Pagos" onClick={() => setAfiliadoPagos(a)}><Receipt size={16} aria-hidden="true" /></BotonAccion>
                <BotonAccion etiqueta="Servicios" onClick={() => setAfiliadoServicios(a)}><ClipboardList size={16} aria-hidden="true" /></BotonAccion>
                <BotonAccion etiqueta="Acceso a la app" onClick={() => setAfiliadoAccesoApp(a)}><Smartphone size={16} aria-hidden="true" /></BotonAccion>
                {rol === "admin" && (
                  <BotonAccion etiqueta="Eliminar" peligro onClick={() => manejarEliminarAfiliado(a)}><Trash2 size={16} aria-hidden="true" /></BotonAccion>
                )}
              </div>
            ),
          },
        ]}
        filas={afiliadosFiltrados}
        cargando={cargando}
        claveFila={(a) => a.id}
        vacioTitulo="No hay afiliados con este estado"
        vacioDescripcion='Usa "Nuevo afiliado" para agregar el primero.'
      />
      {afiliadoServicios && <PanelHistorialServicios afiliado={afiliadoServicios} onCerrar={() => setAfiliadoServicios(null)} />}
      {afiliadoEditando && <PanelEditarAfiliado afiliado={afiliadoEditando} planes={planes} onCerrar={() => setAfiliadoEditando(null)} />}
      {afiliadoBeneficiarios && <PanelBeneficiarios afiliado={afiliadoBeneficiarios} limite={limitePlan(afiliadoBeneficiarios.planId, afiliadoBeneficiarios.sede)} onCerrar={() => setAfiliadoBeneficiarios(null)} />}
      {afiliadoPagos && <PanelPagos afiliado={afiliadoPagos} onCerrar={() => setAfiliadoPagos(null)} />}
      {afiliadoAccesoApp && <PanelAccesoApp afiliado={afiliadoAccesoApp} onCerrar={() => setAfiliadoAccesoApp(null)} />}
    </div>
  );
}
