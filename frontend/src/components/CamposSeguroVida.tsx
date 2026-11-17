import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import CampoPrecio from "./CampoPrecio";
import { PARENTESCOS } from "../utils/parentescos";
import { beneficiariosDelSeguro, MAXIMO_BENEFICIARIOS_SEGURO } from "../types";
import type { BeneficiarioSeguro, SeguroVida, SeguroVidaEntrada } from "../types";

interface Props {
  /** Al activar el seguro se pide la fecha de inicio de vigencia, que es también la del primer pago. */
  conPrimerPago: boolean;
  valorInicial?: SeguroVida;
}

/** Fila del formulario: los números se guardan como texto mientras se escriben. */
interface Fila {
  clave: number;
  nombre: string;
  parentesco: string;
  cedula: string;
  edad: string;
  porcentaje: string;
}

const clase = "w-full rounded-lg border border-vino-100 px-3 py-2 text-sm";

function aInputDate(valor: unknown): string {
  if (!valor) return "";
  const conToDate = valor as { toDate?: () => Date };
  const fecha = conToDate.toDate ? conToDate.toDate() : new Date(valor as string);
  return isNaN(fecha.getTime()) ? "" : fecha.toISOString().slice(0, 10);
}

let siguienteClave = 1;
function filaVacia(porcentaje = ""): Fila {
  return { clave: siguienteClave++, nombre: "", parentesco: "", cedula: "", edad: "", porcentaje };
}

/** Reparte 100 % en partes iguales (el último se queda con el redondeo). */
function repartirIgual(filas: Fila[]): Fila[] {
  const parte = Math.floor((100 / filas.length) * 100) / 100;
  return filas.map((f, i) => ({
    ...f,
    porcentaje: String(i === filas.length - 1 ? Math.round((100 - parte * (filas.length - 1)) * 100) / 100 : parte),
  }));
}

/**
 * Campos del seguro de vida para usar dentro de un <form>. Se leen con
 * leerSeguroDeForm(new FormData(form), conPrimerPago).
 */
export default function CamposSeguroVida({ conPrimerPago, valorInicial }: Props) {
  const [filas, setFilas] = useState<Fila[]>(() => {
    const existentes = beneficiariosDelSeguro(valorInicial);
    if (existentes.length === 0) return [filaVacia("100")];
    return existentes.map((b) => ({
      clave: siguienteClave++,
      nombre: b.nombre,
      parentesco: b.parentesco,
      cedula: b.cedula ?? "",
      edad: String(b.edad ?? ""),
      porcentaje: String(b.porcentaje ?? ""),
    }));
  });

  const suma = Math.round(filas.reduce((t, f) => t + (Number(f.porcentaje) || 0), 0) * 100) / 100;
  const sumaCorrecta = Math.abs(suma - 100) <= 0.01;

  function cambiar(i: number, campo: keyof Omit<Fila, "clave">, valor: string) {
    setFilas((prev) => prev.map((f, idx) => (idx === i ? { ...f, [campo]: valor } : f)));
  }

  return (
    <div className="space-y-3 rounded-lg border border-vino-100 bg-vino-50/40 p-3">
      <p className="text-sm font-medium text-vino-900">Seguro de vida</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-tinta/70">Precio mensual del seguro</label>
          <CampoPrecio name="seguro_precioMensual" required valorInicial={valorInicial?.precioMensual} placeholder="Precio mensual" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-tinta/70">Valor de indemnización que cubre</label>
          <CampoPrecio name="seguro_valorIndemnizacion" required valorInicial={valorInicial?.valorIndemnizacion} placeholder="Indemnización" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-tinta/70">Fecha inicio vigencia</label>
          <input
            name={conPrimerPago ? "seguro_fechaPago" : "seguro_fechaInicio"}
            type="date"
            min="1900-01-01"
            max="2100-12-31"
            required
            defaultValue={conPrimerPago ? undefined : aInputDate(valorInicial?.fechaInicio)}
            className={clase}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-vino-900">
          Beneficiarios del seguro ({filas.length} de {MAXIMO_BENEFICIARIOS_SEGURO})
        </p>
        {filas.length > 1 && (
          <button type="button" onClick={() => setFilas((prev) => repartirIgual(prev))} className="text-xs text-vino-700 hover:underline">
            Repartir en partes iguales
          </button>
        )}
      </div>

      <input type="hidden" name="seguro_benCantidad" value={filas.length} />
      {filas.map((f, i) => (
        <div key={f.clave} className="space-y-2 rounded-lg border border-vino-100 bg-white p-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-tinta/70">Beneficiario {i + 1}</span>
            {filas.length > 1 && (
              <button aria-label="Quitar beneficiario"
                type="button"
                onClick={() => setFilas((prev) => prev.filter((_, idx) => idx !== i))}
                className="rounded p-1 text-red-600 hover:bg-red-50"
                title="Quitar beneficiario"
              >
                <Trash2 size={14} aria-hidden="true" />
              </button>
            )}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <input name={`seguro_ben${i}_nombre`} required value={f.nombre} onChange={(e) => cambiar(i, "nombre", e.target.value)} placeholder="Nombre" aria-label="Nombre" className={clase} />
            <select aria-label="Parentesco" name={`seguro_ben${i}_parentesco`} required value={f.parentesco} onChange={(e) => cambiar(i, "parentesco", e.target.value)} className={clase}>
              <option value="">Parentesco…</option>
              {PARENTESCOS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
              {f.parentesco && !(PARENTESCOS as readonly string[]).includes(f.parentesco) && <option value={f.parentesco}>{f.parentesco}</option>}
            </select>
            <input
              name={`seguro_ben${i}_edad`}
              type="number"
              min={0}
              value={f.edad}
              onChange={(e) => cambiar(i, "edad", e.target.value)}
              placeholder="Edad (opcional)" aria-label="Edad (opcional)"
              className={clase}
            />
            <input name={`seguro_ben${i}_cedula`} value={f.cedula} onChange={(e) => cambiar(i, "cedula", e.target.value)} placeholder="Cédula (opcional)" aria-label="Cédula (opcional)" className={clase} />
            <div className="relative sm:col-span-2">
              <input
                name={`seguro_ben${i}_porcentaje`}
                type="number"
                required
                min={0.01}
                max={100}
                step="0.01"
                value={f.porcentaje}
                onChange={(e) => cambiar(i, "porcentaje", e.target.value)}
                placeholder="Porcentaje de la indemnización" aria-label="Porcentaje de la indemnización"
                className={`${clase} pr-8`}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-tinta/70">%</span>
            </div>
          </div>
        </div>
      ))}

      <div className="flex flex-wrap items-center justify-between gap-2">
        {filas.length < MAXIMO_BENEFICIARIOS_SEGURO ? (
          <button
            type="button"
            onClick={() => setFilas((prev) => repartirIgual([...prev, filaVacia()]))}
            className="flex items-center gap-1 text-sm text-vino-700 hover:underline"
          >
            <Plus size={14} /> Agregar beneficiario
          </button>
        ) : (
          <span className="text-xs text-tinta/70">Máximo {MAXIMO_BENEFICIARIOS_SEGURO} beneficiarios.</span>
        )}
        <span className={`text-xs font-medium ${sumaCorrecta ? "text-green-700" : "text-red-600"}`}>
          Total: {suma} %{sumaCorrecta ? " ✓" : " — debe sumar 100 %"}
        </span>
      </div>
    </div>
  );
}

/** Lee los campos del seguro. Lanza un error si los porcentajes no suman 100 %. */
export function leerSeguroDeForm(form: FormData, conPrimerPago: boolean): SeguroVidaEntrada {
  const texto = (campo: string) => String(form.get(campo) ?? "").trim();
  const cantidad = Number(form.get("seguro_benCantidad")) || 0;
  const beneficiarios: BeneficiarioSeguro[] = [];
  for (let i = 0; i < cantidad; i++) {
    beneficiarios.push({
      nombre: texto(`seguro_ben${i}_nombre`),
      parentesco: texto(`seguro_ben${i}_parentesco`),
      edad: texto(`seguro_ben${i}_edad`) ? Number(form.get(`seguro_ben${i}_edad`)) : undefined,
      cedula: texto(`seguro_ben${i}_cedula`) || undefined,
      porcentaje: Number(form.get(`seguro_ben${i}_porcentaje`)),
    });
  }
  const suma = beneficiarios.reduce((t, b) => t + (b.porcentaje || 0), 0);
  if (Math.abs(suma - 100) > 0.01) {
    throw new Error(`Los porcentajes de los beneficiarios del seguro deben sumar 100 % (ahora suman ${Math.round(suma * 100) / 100} %).`);
  }
  return {
    precioMensual: Number(form.get("seguro_precioMensual")),
    valorIndemnizacion: Number(form.get("seguro_valorIndemnizacion")),
    beneficiarios,
    ...(conPrimerPago ? { fechaPago: texto("seguro_fechaPago") } : { fechaInicio: texto("seguro_fechaInicio") || undefined }),
  };
}
