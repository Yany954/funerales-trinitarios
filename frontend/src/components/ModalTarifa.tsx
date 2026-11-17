import { useMemo, useState, FormEvent } from "react";
import { X, Save, CopyCheck, Info } from "lucide-react";
import { guardarTarifa } from "../api/client";
import { useDialogo } from "../hooks/useDialogo";
import CampoPrecio from "./CampoPrecio";
import type { Convenio, TarifaConvenio } from "../types";

type CampoTarifa = Exclude<keyof TarifaConvenio, "anio">;

/** Los precios de una tarifa, agrupados como se piensan al cotizar un servicio. */
export const GRUPOS_TARIFA: { titulo: string; ayuda: string; campos: { campo: CampoTarifa; etiqueta: string }[] }[] = [
  {
    titulo: "Servicio completo",
    ayuda: "Precio del servicio funerario completo según la gama.",
    campos: [
      { campo: "servicioCompletoBasico", etiqueta: "Básico" },
      { campo: "servicioCompletoSemilujo", etiqueta: "Semilujo" },
      { campo: "servicioCompletoLujo", etiqueta: "Lujo" },
    ],
  },
  {
    titulo: "Por partes",
    ayuda: "Cuando el servicio se cobra por etapas.",
    campos: [
      { campo: "iniciales", etiqueta: "Iniciales" },
      { campo: "finales", etiqueta: "Finales" },
    ],
  },
  {
    titulo: "Traslados",
    ayuda: "",
    campos: [
      { campo: "trasladoLocal", etiqueta: "Traslado local" },
      { campo: "trasladoFluvial", etiqueta: "Traslado fluvial" },
    ],
  },
  {
    titulo: "Adicionales",
    ayuda: "",
    campos: [
      { campo: "precioCofre", etiqueta: "Cofre" },
      { campo: "precioBoveda", etiqueta: "Bóveda" },
    ],
  },
];

interface Props {
  convenio: Convenio;
  /** Tarifas ya guardadas de este convenio. */
  tarifas: TarifaConvenio[];
  /** Año con el que abre el formulario (existente para editar, nuevo para crear). */
  anioInicial: string;
  onCerrar: () => void;
}

const esAnio = (a: string) => /^\d{4}$/.test(a) && Number(a) >= 2000 && Number(a) <= 2100;

export default function ModalTarifa({ convenio, tarifas, anioInicial, onCerrar }: Props) {
  const refDialogo = useDialogo(onCerrar);
  const [anio, setAnio] = useState(anioInicial);
  // De dónde salen los valores precargados: la tarifa del mismo año, o una copia de otro año.
  const [copiaDe, setCopiaDe] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const existente = useMemo(() => (esAnio(anio) ? tarifas.find((t) => t.anio === anio) ?? null : null), [tarifas, anio]);
  const anterior = useMemo(
    () =>
      tarifas
        .filter((t) => !esAnio(anio) || Number(t.anio) < Number(anio))
        .sort((a, b) => Number(b.anio) - Number(a.anio))[0] ?? null,
    [tarifas, anio]
  );
  const fuente = existente ?? (copiaDe ? tarifas.find((t) => t.anio === copiaDe) ?? null : null);

  async function manejarGuardar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!esAnio(anio)) {
      setError("Escribe un año válido de 4 dígitos (ej. 2026).");
      return;
    }
    const form = new FormData(e.currentTarget);
    const numero = (campo: string) => (form.get(campo) ? Number(form.get(campo)) : undefined);
    const valores = Object.fromEntries(
      GRUPOS_TARIFA.flatMap((g) => g.campos).map(({ campo }) => [campo, numero(campo)])
    ) as Partial<Record<CampoTarifa, number>>;
    if (Object.values(valores).every((v) => v === undefined)) {
      setError("Escribe al menos un precio.");
      return;
    }
    setGuardando(true);
    try {
      await guardarTarifa({ convenioId: convenio.id, anio, ...valores });
      onCerrar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la tarifa.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-tinta/40 p-4">
      <div ref={refDialogo} role="dialog" aria-modal="true" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-vino-700">{convenio.nombre}</p>
            <h2 className="font-display text-xl text-vino-900">{existente ? `Editar tarifa ${anio}` : "Nueva tarifa"}</h2>
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="rounded-lg p-1.5 text-tinta/70 hover:bg-vino-50 hover:text-tinta">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={manejarGuardar} className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-[10rem_1fr] sm:items-end">
            <div>
              <label htmlFor="tarifa-anio" className="mb-1 block text-sm font-medium text-tinta">
                Año de la tarifa
              </label>
              <input
                id="tarifa-anio"
                inputMode="numeric"
                maxLength={4}
                value={anio}
                onChange={(e) => {
                  setAnio(e.target.value.replace(/\D/g, ""));
                  setCopiaDe(null);
                }}
                required
                aria-describedby="tarifa-anio-ayuda"
                className="w-full rounded-lg border border-vino-100 px-3 py-2 text-sm tabular-nums"
              />
            </div>
            <p id="tarifa-anio-ayuda" className="flex items-start gap-1.5 text-xs text-tinta/70">
              <Info size={14} aria-hidden="true" className="mt-0.5 shrink-0" />
              {existente
                ? `Ya hay una tarifa ${anio}: al guardar se reemplazan sus precios.`
                : "Los servicios de ese año con este convenio se cobran con estos precios."}
            </p>
          </div>

          {!existente && anterior && (
            <button
              type="button"
              onClick={() => setCopiaDe(anterior.anio)}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-vino-400 px-3 py-2.5 text-sm font-medium text-vino-700 hover:bg-vino-50"
            >
              <CopyCheck size={16} aria-hidden="true" />
              {copiaDe ? `Valores copiados de ${copiaDe} — ajústalos y guarda` : `Copiar los precios de ${anterior.anio} para empezar`}
            </button>
          )}

          {/* La key cambia solo con el año completo o al copiar: así se precargan los
              valores sin quitarle el foco al campo del año mientras se escribe. */}
          <div key={`${existente?.anio ?? ""}-${copiaDe ?? ""}`} className="space-y-4">
            {GRUPOS_TARIFA.map((g) => (
              <fieldset key={g.titulo} className="rounded-xl border border-vino-100 p-4">
                <legend className="px-1 text-sm font-semibold text-vino-900">{g.titulo}</legend>
                {g.ayuda && <p className="mb-3 text-xs text-tinta/70">{g.ayuda}</p>}
                <div className="grid gap-3 sm:grid-cols-3">
                  {g.campos.map(({ campo, etiqueta }) => (
                    <div key={campo}>
                      <label htmlFor={`tarifa-${campo}`} className="mb-1 block text-xs font-medium text-tinta/70">
                        {etiqueta}
                      </label>
                      <CampoPrecio id={`tarifa-${campo}`} name={campo} placeholder="Sin precio" valorInicial={fuente?.[campo] as number | undefined} />
                    </div>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onCerrar} className="min-h-[44px] rounded-lg border border-vino-100 px-4 text-sm font-medium text-tinta/70 hover:bg-vino-50">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-vino-700 px-5 text-sm font-medium text-white transition hover:bg-vino-600 active:translate-y-px disabled:opacity-60"
            >
              <Save size={16} aria-hidden="true" />
              {guardando ? "Guardando…" : existente ? `Guardar tarifa ${anio}` : esAnio(anio) ? `Crear tarifa ${anio}` : "Crear tarifa"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
