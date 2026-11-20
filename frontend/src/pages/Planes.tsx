import { useEffect, useMemo, useState, FormEvent } from "react";
import { collection, collectionGroup, getCountFromServer, onSnapshot, query, where } from "firebase/firestore";
import { Plus, Pencil, X, Save, TrendingUp, TrendingDown, Users, CalendarClock, Info, ListChecks, Check } from "lucide-react";
import { beneficiosDelPlan, beneficiosPredeterminados } from "../utils/beneficiosPlan";
import { db, crearPlan, actualizarPlan, guardarPrecioAnioPlan } from "../api/client";
import CampoPrecio from "../components/CampoPrecio";
import { BarraDistribucion } from "../components/BarraSegmentada";
import { useEstadoCarga, AvisoCarga } from "../hooks/useEstadoCarga";
import { useDialogo } from "../hooks/useDialogo";
import { formatoPesos } from "../utils/formato";
import type { PlanFunerario, HistorialPrecioPlan } from "../types";

const ANIO_ACTUAL = String(new Date().getFullYear());

/** Cupo de beneficiarios por año (ver utils/cupoBeneficiarios). */
function textoCupo(nombre: string): string {
  return /integral/i.test(nombre) ? "7 beneficiarios por año (8 en la sede Pelaya)" : "7 beneficiarios por año";
}

export default function Planes() {
  const [planes, setPlanes] = useState<PlanFunerario[]>([]);
  const [historial, setHistorial] = useState<HistorialPrecioPlan[]>([]);
  const [afiliadosPorPlan, setAfiliadosPorPlan] = useState<Record<string, number>>({});
  const carga = useEstadoCarga();

  const [modalPlan, setModalPlan] = useState<{ plan: PlanFunerario | null } | null>(null);
  const [modalPrecio, setModalPrecio] = useState<{ plan: PlanFunerario; anio: string } | null>(null);
  const [modalBeneficios, setModalBeneficios] = useState<PlanFunerario | null>(null);

  useEffect(() => {
    return onSnapshot(
      query(collection(db, "planes_funerarios")),
      (snap) => {
        setPlanes(snap.docs.map((d) => ({ id: d.id, ...d.data() } as PlanFunerario)).sort((a, b) => a.valorMensual - b.valorMensual));
        carga.listo();
      },
      (err) => carga.fallo(err)
    );
  }, [carga.intento]);

  useEffect(() => {
    return onSnapshot(
      query(collectionGroup(db, "historial")),
      (snap) => setHistorial(snap.docs.map((d) => ({ ...(d.data() as HistorialPrecioPlan), planId: d.ref.parent.parent!.id }))),
      (err) => console.error("Error cargando historial de precios:", err)
    );
  }, []);

  // Cuántos afiliados tiene cada plan (conteo en el servidor, sin descargar los documentos).
  const idsPlanes = planes.map((p) => p.id).join(",");
  useEffect(() => {
    if (!idsPlanes) return;
    let cancelado = false;
    Promise.all(
      idsPlanes.split(",").map(async (id) => {
        const snap = await getCountFromServer(query(collection(db, "afiliados"), where("planId", "==", id)));
        return [id, snap.data().count] as const;
      })
    )
      .then((pares) => !cancelado && setAfiliadosPorPlan(Object.fromEntries(pares)))
      .catch((err) => console.error("No se pudo contar afiliados por plan:", err));
    return () => {
      cancelado = true;
    };
  }, [idsPlanes]);

  const historialDe = (planId: string) =>
    historial.filter((h) => h.planId === planId).sort((a, b) => Number(b.anio) - Number(a.anio));

  const distribucion = useMemo(
    () => planes.map((p) => ({ nombre: p.nombre, valor: afiliadosPorPlan[p.id] ?? 0 })).sort((a, b) => b.valor - a.valor),
    [planes, afiliadosPorPlan]
  );
  const totalAfiliados = distribucion.reduce((t, p) => t + p.valor, 0);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h2 className="font-display text-2xl text-vino-900">Planes funerarios</h2>
          <p className="mt-1 text-sm text-tinta/70">
            Lo que pagan los afiliados cada mes. Cuando cambie la mensualidad, registra el precio nuevo con su año: los años anteriores quedan en el historial.
          </p>
        </div>
        <button
          onClick={() => setModalPlan({ plan: null })}
          className="flex min-h-[44px] items-center gap-2 rounded-lg bg-vino-700 px-4 text-sm font-medium text-white transition hover:bg-vino-600 active:translate-y-px"
        >
          <Plus size={16} aria-hidden="true" /> Nuevo plan
        </button>
      </header>

      <AvisoCarga carga={carga} />

      {/* Cómo se reparten los afiliados entre planes */}
      {totalAfiliados > 0 && (
        <section aria-labelledby="reparto" className="rounded-2xl border border-vino-100 bg-white p-5">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h3 id="reparto" className="font-display text-base text-vino-900">Afiliados por plan</h3>
            <p className="text-sm text-tinta/70">
              <span className="font-display text-2xl text-vino-900 tabular-nums">{totalAfiliados}</span> afiliados en total
            </p>
          </div>
          <BarraDistribucion partes={distribucion} etiqueta="Reparto de afiliados entre planes" />
        </section>
      )}

      {/* Tarjetas de planes */}
      <section aria-label="Planes" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {planes.map((p) => (
          <TarjetaPlan
            key={p.id}
            plan={p}
            historial={historialDe(p.id)}
            afiliados={afiliadosPorPlan[p.id]}
            onRenombrar={() => setModalPlan({ plan: p })}
            onPrecio={(anio) => setModalPrecio({ plan: p, anio })}
            onBeneficios={() => setModalBeneficios(p)}
          />
        ))}
        {carga.cargando && <p className="text-sm text-tinta/70">Cargando…</p>}
        {!carga.cargando && planes.length === 0 && (
          <div className="rounded-2xl border border-dashed border-vino-400 bg-white p-8 text-center md:col-span-2 xl:col-span-3">
            <p className="font-display text-lg text-vino-900">Todavía no hay planes</p>
            <p className="text-sm text-tinta/70">Crea el primero con el botón "Nuevo plan".</p>
          </div>
        )}
      </section>

      {modalPlan && <ModalPlan plan={modalPlan.plan} onCerrar={() => setModalPlan(null)} />}
      {modalBeneficios && <ModalBeneficios plan={modalBeneficios} onCerrar={() => setModalBeneficios(null)} />}
      {modalPrecio && (
        <ModalPrecio plan={modalPrecio.plan} historial={historialDe(modalPrecio.plan.id)} anioInicial={modalPrecio.anio} onCerrar={() => setModalPrecio(null)} />
      )}
    </div>
  );
}

function TarjetaPlan({
  plan,
  historial,
  afiliados,
  onRenombrar,
  onPrecio,
  onBeneficios,
}: {
  plan: PlanFunerario;
  historial: HistorialPrecioPlan[];
  afiliados: number | undefined;
  onRenombrar: () => void;
  onPrecio: (anio: string) => void;
  onBeneficios: () => void;
}) {
  const beneficios = beneficiosDelPlan(plan.nombre, plan.beneficios);
  const editados = (plan.beneficios ?? []).length > 0;
  const vigente = historial[0];
  const anterior = historial[1];
  const cambio = vigente && anterior && anterior.valorMensual > 0 ? ((vigente.valorMensual - anterior.valorMensual) / anterior.valorMensual) * 100 : null;

  return (
    <article className="flex flex-col rounded-2xl border border-vino-100 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-xl text-vino-900">{plan.nombre}</h3>
        <button onClick={onRenombrar} aria-label={`Cambiar el nombre de ${plan.nombre}`} className="rounded-lg p-2 text-vino-700 hover:bg-vino-50">
          <Pencil size={16} aria-hidden="true" />
        </button>
      </div>

      <p className="mt-3 flex items-baseline gap-1.5">
        <span className="font-display text-3xl text-vino-900 tabular-nums">{plan.valorMensual ? formatoPesos(plan.valorMensual) : "Sin precio"}</span>
        {plan.valorMensual > 0 && <span className="text-sm text-tinta/70">/ mes</span>}
      </p>
      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-tinta/70">
        {vigente && (
          <span className="flex items-center gap-1">
            <CalendarClock size={13} aria-hidden="true" /> Vigente desde {vigente.anio}
          </span>
        )}
        {cambio !== null && (
          <span className={`flex items-center gap-1 font-medium ${cambio >= 0 ? "text-vino-700" : "text-green-700"}`}>
            {cambio >= 0 ? <TrendingUp size={13} aria-hidden="true" /> : <TrendingDown size={13} aria-hidden="true" />}
            {cambio >= 0 ? "+" : ""}
            {cambio.toFixed(1)} % frente a {anterior.anio}
          </span>
        )}
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-crema p-3 text-sm">
        <div>
          <dt className="flex items-center gap-1 text-xs text-tinta/70">
            <Users size={13} aria-hidden="true" /> Afiliados
          </dt>
          <dd className="font-semibold tabular-nums text-tinta">{afiliados ?? "…"}</dd>
        </div>
        <div>
          <dt className="text-xs text-tinta/70">Cupo</dt>
          <dd className="text-xs font-medium text-tinta">{textoCupo(plan.nombre)}</dd>
        </div>
      </dl>

      {historial.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium text-tinta/70">Historial de precios</p>
          <ol className="space-y-1.5">
            {historial.slice(0, 5).map((h, i) => (
              <li key={h.anio} className="flex items-center justify-between gap-2 text-sm">
                <span className="tabular-nums text-tinta/70">
                  {h.anio}
                  {i === 0 && <span className="ml-2 rounded-full bg-vino-50 px-2 py-0.5 text-xs font-medium text-vino-700">actual</span>}
                </span>
                <span className="flex items-center gap-2">
                  <span className="font-medium tabular-nums">{formatoPesos(h.valorMensual)}</span>
                  <button onClick={() => onPrecio(h.anio)} aria-label={`Corregir el precio de ${h.anio}`} className="rounded p-1 text-vino-700 hover:bg-vino-50">
                    <Pencil size={13} aria-hidden="true" />
                  </button>
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="mt-4">
        <p className="mb-2 flex items-center justify-between gap-2 text-xs font-medium text-tinta/70">
          <span className="flex items-center gap-1"><ListChecks size={13} aria-hidden="true" /> Beneficios ({beneficios.length})</span>
          <span className="font-normal">{beneficios.length === 0 ? "sin definir" : editados ? "editados" : "de la hoja"}</span>
        </p>
        {beneficios.length === 0 ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Sin beneficios: en la app los afiliados verán "pregunta en tu sede".
          </p>
        ) : (
          <ul className="space-y-1">
            {beneficios.slice(0, 3).map((b) => (
              <li key={b} className="flex items-start gap-1.5 text-sm text-tinta">
                <Check size={14} aria-hidden="true" className="mt-0.5 shrink-0 text-green-700" /> {b}
              </li>
            ))}
            {beneficios.length > 3 && <li className="pl-5 text-xs text-tinta/60">y {beneficios.length - 3} más…</li>}
          </ul>
        )}
        <button onClick={onBeneficios} className="mt-2 text-sm font-medium text-vino-700 hover:underline">
          Ver y editar beneficios
        </button>
      </div>

      <div className="mt-auto pt-5">
        <button
          onClick={() => onPrecio(historial.some((h) => h.anio === ANIO_ACTUAL) ? String(Number(ANIO_ACTUAL) + 1) : ANIO_ACTUAL)}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-vino-100 px-4 text-sm font-medium text-vino-700 transition hover:bg-vino-50"
        >
          <Plus size={16} aria-hidden="true" /> Registrar nuevo precio
        </button>
      </div>
    </article>
  );
}

function ModalPlan({ plan, onCerrar }: { plan: PlanFunerario | null; onCerrar: () => void }) {
  const refDialogo = useDialogo(onCerrar);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function manejarGuardar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const nombre = String(form.get("nombre") ?? "").trim();
    setGuardando(true);
    try {
      if (plan) {
        await actualizarPlan({ id: plan.id, nombre });
      } else {
        const valorMensual = Number(form.get("valorMensual"));
        const anio = String(form.get("anio") ?? ANIO_ACTUAL);
        const nuevo = await crearPlan({ nombre, valorMensual });
        if (valorMensual > 0) await guardarPrecioAnioPlan({ planId: nuevo.id, anio, valorMensual });
      }
      onCerrar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el plan.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-tinta/40 p-4">
      <div ref={refDialogo} role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-start justify-between">
          <h2 className="font-display text-xl text-vino-900">{plan ? "Cambiar nombre del plan" : "Nuevo plan"}</h2>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="rounded-lg p-1.5 text-tinta/70 hover:bg-vino-50 hover:text-tinta">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <form onSubmit={manejarGuardar} className="space-y-4">
          <div>
            <label htmlFor="plan-nombre" className="mb-1 block text-sm font-medium">Nombre</label>
            <input id="plan-nombre" name="nombre" required defaultValue={plan?.nombre} placeholder="Ej. Girasol" className="w-full rounded-lg border border-vino-100 px-3 py-2 text-sm" />
          </div>
          {!plan && (
            <div className="grid gap-3 sm:grid-cols-[1fr_7rem]">
              <div>
                <label htmlFor="plan-valor" className="mb-1 block text-sm font-medium">Mensualidad</label>
                <CampoPrecio id="plan-valor" name="valorMensual" required placeholder="Ej. 25.000" />
              </div>
              <div>
                <label htmlFor="plan-anio" className="mb-1 block text-sm font-medium">Desde</label>
                <input id="plan-anio" name="anio" inputMode="numeric" maxLength={4} pattern="\d{4}" defaultValue={ANIO_ACTUAL} required className="w-full rounded-lg border border-vino-100 px-3 py-2 text-sm tabular-nums" />
              </div>
            </div>
          )}
          {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onCerrar} className="min-h-[44px] rounded-lg border border-vino-100 px-4 text-sm font-medium text-tinta/70 hover:bg-vino-50">
              Cancelar
            </button>
            <button type="submit" disabled={guardando} className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-vino-700 px-5 text-sm font-medium text-white transition hover:bg-vino-600 active:translate-y-px disabled:opacity-60">
              <Save size={16} aria-hidden="true" />
              {guardando ? "Guardando…" : plan ? "Guardar nombre" : "Crear plan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ModalPrecio({
  plan,
  historial,
  anioInicial,
  onCerrar,
}: {
  plan: PlanFunerario;
  historial: HistorialPrecioPlan[];
  anioInicial: string;
  onCerrar: () => void;
}) {
  const refDialogo = useDialogo(onCerrar);
  const [anio, setAnio] = useState(anioInicial);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const existente = historial.find((h) => h.anio === anio);

  async function manejarGuardar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!/^\d{4}$/.test(anio)) {
      setError("Escribe un año válido de 4 dígitos.");
      return;
    }
    const form = new FormData(e.currentTarget);
    setGuardando(true);
    try {
      await guardarPrecioAnioPlan({ planId: plan.id, anio, valorMensual: Number(form.get("valorMensual")) });
      onCerrar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el precio.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-tinta/40 p-4">
      <div ref={refDialogo} role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-vino-700">{plan.nombre}</p>
            <h2 className="font-display text-xl text-vino-900">{existente ? `Corregir precio ${anio}` : "Registrar nuevo precio"}</h2>
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="rounded-lg p-1.5 text-tinta/70 hover:bg-vino-50 hover:text-tinta">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <form onSubmit={manejarGuardar} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[7rem_1fr]">
            <div>
              <label htmlFor="precio-anio" className="mb-1 block text-sm font-medium">Año</label>
              <input
                id="precio-anio"
                inputMode="numeric"
                maxLength={4}
                value={anio}
                onChange={(e) => setAnio(e.target.value.replace(/\D/g, ""))}
                required
                className="w-full rounded-lg border border-vino-100 px-3 py-2 text-sm tabular-nums"
              />
            </div>
            <div>
              <label htmlFor="precio-valor" className="mb-1 block text-sm font-medium">Mensualidad</label>
              <CampoPrecio key={existente?.anio ?? "nuevo"} id="precio-valor" name="valorMensual" required valorInicial={existente?.valorMensual ?? plan.valorMensual} />
            </div>
          </div>
          <p className="flex items-start gap-1.5 rounded-lg bg-vino-50 px-3 py-2 text-xs text-vino-900">
            <Info size={14} aria-hidden="true" className="mt-0.5 shrink-0" />
            {existente
              ? `Ya hay un precio para ${anio}: se reemplaza.`
              : `Este precio rige desde ${anio || "ese año"} hasta que registres otro cambio.`}
            {" "}Los afiliados actuales conservan la cuota con la que se afiliaron.
          </p>
          {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onCerrar} className="min-h-[44px] rounded-lg border border-vino-100 px-4 text-sm font-medium text-tinta/70 hover:bg-vino-50">
              Cancelar
            </button>
            <button type="submit" disabled={guardando} className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-vino-700 px-5 text-sm font-medium text-white transition hover:bg-vino-600 active:translate-y-px disabled:opacity-60">
              <Save size={16} aria-hidden="true" />
              {guardando ? "Guardando…" : "Guardar precio"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Beneficios del plan, uno por línea. Es lo que ve cada afiliado del plan en
 * la app ("Ver beneficios de mi plan"). Si se deja vacío, se vuelve a los de
 * la hoja de la empresa (o a "pregunta en tu sede" si el plan no está en ella).
 */
function ModalBeneficios({ plan, onCerrar }: { plan: PlanFunerario; onCerrar: () => void }) {
  const refDialogo = useDialogo(onCerrar);
  const [texto, setTexto] = useState(beneficiosDelPlan(plan.nombre, plan.beneficios).join("\n"));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deLaHoja = beneficiosPredeterminados(plan.nombre);
  const lineas = texto.split("\n").map((l) => l.trim()).filter(Boolean);

  async function guardar(beneficios: string[]) {
    setError(null);
    setGuardando(true);
    try {
      await actualizarPlan({ id: plan.id, beneficios });
      onCerrar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron guardar los beneficios.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-tinta/40 p-4">
      <div ref={refDialogo} role="dialog" aria-modal="true" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-vino-700">{plan.nombre}</p>
            <h2 className="font-display text-xl text-vino-900">Beneficios del plan</h2>
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="rounded-lg p-1.5 text-tinta/70 hover:bg-vino-50 hover:text-tinta">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void guardar(lineas);
          }}
          className="space-y-4"
        >
          <p className="flex items-start gap-1.5 rounded-lg bg-vino-50 px-3 py-2 text-xs text-vino-900">
            <Info size={14} aria-hidden="true" className="mt-0.5 shrink-0" />
            Escribe un beneficio por línea. Es lo que ven los afiliados de este plan en la app, en "Ver beneficios de mi plan".
          </p>
          <div>
            <label htmlFor="plan-beneficios" className="mb-1 flex justify-between text-sm font-medium">
              <span>Beneficios y condiciones</span>
              <span className="font-normal text-tinta/60">{lineas.length} líneas</span>
            </label>
            <textarea
              id="plan-beneficios"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={16}
              className="w-full rounded-lg border border-vino-100 px-3 py-2 text-sm leading-relaxed"
              placeholder={"Cofre forrado.\nTraslado local e intermunicipal.\n…"}
            />
          </div>
          {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            {deLaHoja ? (
              <button type="button" onClick={() => setTexto(deLaHoja.join("\n"))} className="text-left text-sm font-medium text-vino-700 hover:underline">
                Volver a los de la hoja de la empresa
              </button>
            ) : (
              <span />
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <button type="button" onClick={onCerrar} className="min-h-[44px] rounded-lg border border-vino-100 px-4 text-sm font-medium text-tinta/70 hover:bg-vino-50">
                Cancelar
              </button>
              <button type="submit" disabled={guardando} className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-vino-700 px-5 text-sm font-medium text-white transition hover:bg-vino-600 active:translate-y-px disabled:opacity-60">
                <Save size={16} aria-hidden="true" />
                {guardando ? "Guardando…" : "Guardar beneficios"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
