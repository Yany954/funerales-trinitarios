import { useState, FormEvent } from "react";
import { useDialogo } from "../hooks/useDialogo";
import { X, Save } from "lucide-react";
import { actualizarAfiliado, guardarSeguroVida } from "../api/client";
import CamposSeguroVida, { leerSeguroDeForm } from "./CamposSeguroVida";
import CampoPrecio from "./CampoPrecio";
import { confirmarAccion } from "../utils/confirmar";
import type { Afiliado, PlanFunerario } from "../types";
import { UBICACIONES_POR_SEDE, EDAD_MAXIMA_TITULAR_SEGURO } from "../types";
import { calcularEdad } from "../utils/formato";
interface Props {
  afiliado: Afiliado;
  planes: PlanFunerario[];
  onCerrar: () => void;
}

function aInputDate(valor: unknown): string {
  const conToDate = valor as { toDate?: () => Date };
  const fecha = conToDate?.toDate ? conToDate.toDate() : new Date(valor as string);
  return isNaN(fecha.getTime()) ? "" : fecha.toISOString().slice(0, 10);
}

export default function PanelEditarAfiliado({ afiliado, planes, onCerrar }: Props) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conSeguro, setConSeguro] = useState(afiliado.tieneSeguroVida);
  // Activar un seguro que nunca tuvo pide precio, beneficiario y primer pago.
  const activandoSeguroNuevo = conSeguro && !afiliado.seguroVida;
  const [ubicacionSeleccionada, setUbicacionSeleccionada] = useState(afiliado.ubicacion ?? afiliado.vereda ?? "");

  async function manejarGuardar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    if (afiliado.tieneSeguroVida && !conSeguro) {
      const ok = await confirmarAccion(
        "¿Quitar el seguro de vida?",
        `${afiliado.nombreCompleto} dejará de aparecer en la página Seguros de vida. Sus pagos del seguro se conservan.`,
        "Sí, quitar"
      );
      if (!ok) return;
    }
    setGuardando(true);
    try {
      // Se lee antes de guardar para que un error del seguro (p. ej. porcentajes) no deje el afiliado a medias.
      const seguroNuevo = activandoSeguroNuevo ? leerSeguroDeForm(form, true) : undefined;
      const edadTitular = calcularEdad(String(form.get("fechaNacimiento") || "") || afiliado.fechaNacimiento);
      if (seguroNuevo && edadTitular !== null && edadTitular > EDAD_MAXIMA_TITULAR_SEGURO) {
        throw new Error(`El titular tiene ${edadTitular} años: el seguro de vida solo se puede tomar hasta los ${EDAD_MAXIMA_TITULAR_SEGURO} años.`);
      }
      await actualizarAfiliado({
        id: afiliado.id,
        nombreCompleto: String(form.get("nombreCompleto")),
        cedula: String(form.get("cedula") ?? "").trim(),
        numeroContrato: String(form.get("numeroContrato")),
        planId: String(form.get("planId")),
        ubicacion: String(form.get("ubicacion") || ""), // "" = la misma sede
        fechaAfiliacionReal: String(form.get("fechaAfiliacionReal")),
        fechaNacimiento: String(form.get("fechaNacimiento") || "") || undefined,
        valorCuotaMensual: Number(form.get("valorCuotaMensual")),
        celular: String(form.get("celular") ?? "").trim(),
        tieneSeguroVida: conSeguro,
      });
      if (seguroNuevo) {
        await guardarSeguroVida({ afiliadoId: afiliado.id, ...seguroNuevo });
      }
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
      <div ref={refDialogo} role="dialog" aria-modal="true" className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg text-vino-900">Editar afiliado</h3>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="rounded-lg p-1 text-tinta/70 hover:text-tinta"><X size={20} aria-hidden="true" /></button>
        </div>
        <form onSubmit={manejarGuardar} className="space-y-3">
          <input name="nombreCompleto" required defaultValue={afiliado.nombreCompleto} placeholder="Nombre completo" aria-label="Nombre completo" className="w-full rounded-lg border border-vino-100 px-3 py-2 text-sm" />
          <input name="cedula" defaultValue={afiliado.cedula} placeholder="Cédula (opcional)" aria-label="Cédula (opcional)" className="w-full rounded-lg border border-vino-100 px-3 py-2 text-sm" />
          <input name="numeroContrato" required defaultValue={afiliado.numeroContrato} placeholder="Número de contrato" aria-label="Número de contrato" className="w-full rounded-lg border border-vino-100 px-3 py-2 text-sm" />
          <select name="planId" required defaultValue={afiliado.planId} className="w-full rounded-lg border border-vino-100 px-3 py-2 text-sm">
            {planes.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
          <select name="ubicacion" value={ubicacionSeleccionada} onChange={(e) => setUbicacionSeleccionada(e.target.value)} className="w-full rounded-lg border border-vino-100 px-3 py-2 text-sm">
            <option value="">Ubicación: {afiliado.sede} (por defecto)</option>
            {(UBICACIONES_POR_SEDE[afiliado.sede] ?? []).map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
          <label className="block text-xs text-tinta/70">Fecha de afiliación</label>
          <input name="fechaAfiliacionReal" type="date" min="1900-01-01" max="2100-12-31" required defaultValue={aInputDate(afiliado.fechaAfiliacionReal)} className="w-full rounded-lg border border-vino-100 px-3 py-2 text-sm" />
          <label className="block text-xs text-tinta/70">Fecha de nacimiento (opcional)</label>
<input name="fechaNacimiento" type="date" min="1900-01-01" max="2100-12-31" defaultValue={aInputDate(afiliado.fechaNacimiento)} className="w-full rounded-lg border border-vino-100 px-3 py-2 text-sm" />
<label className="block text-xs text-tinta/70">Celular (opcional)</label>
          <input name="celular" type="tel" inputMode="tel" defaultValue={afiliado.celular ?? ""} placeholder="Ej. 300 123 4567" aria-label="Celular" className="w-full rounded-lg border border-vino-100 px-3 py-2 text-sm" />
          <label className="block text-xs text-tinta/70">Cuota mensual que paga</label>
          <CampoPrecio name="valorCuotaMensual" required valorInicial={afiliado.valorCuotaMensual} placeholder="Cuota mensual" />
          <label className="flex items-center gap-2 text-sm text-tinta/70">
            <input type="checkbox" checked={conSeguro} onChange={(e) => setConSeguro(e.target.checked)} />
            Tiene seguro de vida
          </label>
          {activandoSeguroNuevo && <CamposSeguroVida conPrimerPago />}
          {conSeguro && afiliado.seguroVida && (
            <p className="text-xs text-tinta/70">Los datos y pagos del seguro se editan en la página Seguros de vida.</p>
          )}
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