import { useState } from "react";
import { X, Plus, Trash2, HeartCrack, Save } from "lucide-react";
import { actualizarBeneficiarios, registrarFallecimientoBeneficiario } from "../api/client";
import SubirDocumento from "./SubirDocumento";
import { formatoFecha } from "../utils/formato";
import { contarBeneficiariosQueOcupanCupo, LIMITE_BENEFICIARIOS_POR_ANIO } from "../utils/cupoBeneficiarios";
import type { Afiliado, Beneficiario } from "../types";

interface Props {
  afiliado: Afiliado;
  onCerrar: () => void;
}

export default function PanelBeneficiarios({ afiliado, onCerrar }: Props) {
  const [beneficiarios, setBeneficiarios] = useState<Beneficiario[]>(afiliado.beneficiarios ?? []);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [marcandoFallecimiento, setMarcandoFallecimiento] = useState<number | null>(null);
  const [fechaFallecimiento, setFechaFallecimiento] = useState("");
  const [certificadoURL, setCertificadoURL] = useState<string[]>([]);
  const [guardandoFallecimiento, setGuardandoFallecimiento] = useState(false);

  const anioActual = new Date().getFullYear();
  const cupoUsado = contarBeneficiariosQueOcupanCupo(beneficiarios, anioActual);

  function actualizarFila(i: number, campo: "nombre" | "parentesco" | "cedula", valor: string) {
    setBeneficiarios((prev) => {
      const copia = [...prev];
      copia[i] = { ...copia[i], [campo]: valor };
      return copia;
    });
  }

  async function guardar() {
    setError(null);
    setGuardando(true);
    try {
      const validos = beneficiarios
        .filter((b) => b.nombre.trim() && b.cedula.trim())
        .map((b) => ({ nombre: b.nombre, parentesco: b.parentesco, cedula: b.cedula }));
      await actualizarBeneficiarios({ afiliadoId: afiliado.id, beneficiarios: validos });
      onCerrar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  }

  function abrirNovedad(i: number) {
    setMarcandoFallecimiento(i);
    setFechaFallecimiento("");
    setCertificadoURL([]);
    setError(null);
  }

  async function confirmarFallecimiento(cedulaBeneficiario: string) {
    if (!fechaFallecimiento || certificadoURL.length === 0) {
      setError("Ingresa la fecha de fallecimiento y adjunta el certificado de defunción.");
      return;
    }
    setGuardandoFallecimiento(true);
    setError(null);
    try {
      const actualizado = await registrarFallecimientoBeneficiario({
        afiliadoId: afiliado.id,
        cedulaBeneficiario,
        fechaFallecimiento,
        certificadoDefuncionURL: certificadoURL[0],
      });
      setBeneficiarios(actualizado.beneficiarios);
      setMarcandoFallecimiento(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar el fallecimiento.");
    } finally {
      setGuardandoFallecimiento(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-tinta/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg text-vino-900">Beneficiarios — {afiliado.nombreCompleto}</h3>
            <p className="text-xs text-tinta/50">
              Titular, cédula {afiliado.cedula} · {cupoUsado} de {LIMITE_BENEFICIARIOS_POR_ANIO} cupos usados en {anioActual}
            </p>
          </div>
          <button onClick={onCerrar} className="text-tinta/40 hover:text-tinta"><X size={20} /></button>
        </div>

        <div className="space-y-3">
          {beneficiarios.length === 0 && <p className="text-sm text-tinta/50">Este afiliado todavía no tiene beneficiarios.</p>}

          {beneficiarios.map((b, i) => (
            <div key={i} className={`rounded-lg border p-3 ${b.fallecido ? "border-red-100 bg-red-50/30" : "border-vino-100"}`}>
              <div className="grid grid-cols-[1fr_1fr_1fr_2rem] gap-2">
                <input placeholder="Nombre" value={b.nombre} disabled={b.fallecido} onChange={(e) => actualizarFila(i, "nombre", e.target.value)} className="rounded-lg border border-vino-100 px-2 py-1.5 text-sm disabled:bg-vino-50" />
                <input placeholder="Parentesco" value={b.parentesco} disabled={b.fallecido} onChange={(e) => actualizarFila(i, "parentesco", e.target.value)} className="rounded-lg border border-vino-100 px-2 py-1.5 text-sm disabled:bg-vino-50" />
                <input placeholder="Cédula" value={b.cedula} disabled={b.fallecido} onChange={(e) => actualizarFila(i, "cedula", e.target.value)} className="rounded-lg border border-vino-100 px-2 py-1.5 text-sm disabled:bg-vino-50" />
                {!b.fallecido && (
                  <button onClick={() => setBeneficiarios((prev) => prev.filter((_, idx) => idx !== i))} className="text-tinta/40 hover:text-red-600">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-tinta/50">
                {b.fechaAdicion ? <span>Alta: {formatoFecha(b.fechaAdicion)}</span> : null}
                {b.fallecido ? (
                  <span className="flex items-center gap-1 text-red-700">
                    <HeartCrack size={12} /> Fallecido {formatoFecha(b.fechaFallecimiento)}
                    {b.certificadoDefuncionURL && (
                      <a href={b.certificadoDefuncionURL} target="_blank" rel="noreferrer" className="underline">Ver certificado</a>
                    )}
                  </span>
                ) : (
                  <button onClick={() => abrirNovedad(i)} className="text-vino-700 hover:underline">Registrar fallecimiento</button>
                )}
              </div>

              {marcandoFallecimiento === i && (
                <div className="mt-2 space-y-2 rounded-lg bg-vino-50 p-3">
                  <p className="text-xs font-medium text-vino-900">Novedad de fallecimiento</p>
                  <input type="date" value={fechaFallecimiento} onChange={(e) => setFechaFallecimiento(e.target.value)} className="rounded-lg border border-vino-100 px-2 py-1.5 text-sm" />
                  <SubirDocumento carpeta={`afiliados/${afiliado.sede}/${afiliado.id}`} documentos={certificadoURL} onCambiar={setCertificadoURL} />
                  <div className="flex gap-2">
                    <button
                      onClick={() => confirmarFallecimiento(b.cedula)}
                      disabled={guardandoFallecimiento}
                      className="rounded-lg bg-vino-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-vino-600 disabled:opacity-60"
                    >
                      {guardandoFallecimiento ? "Guardando…" : "Confirmar"}
                    </button>
                    <button onClick={() => setMarcandoFallecimiento(null)} className="rounded-lg border border-vino-100 px-3 py-1.5 text-xs text-tinta/60">Cancelar</button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {cupoUsado < LIMITE_BENEFICIARIOS_POR_ANIO ? (
            <button onClick={() => setBeneficiarios((prev) => [...prev, { nombre: "", parentesco: "", cedula: "" }])} className="flex items-center gap-1.5 text-sm text-vino-700 hover:underline">
              <Plus size={14} /> Agregar beneficiario
            </button>
          ) : (
            <p className="text-xs text-amber-700">Ya se usaron los {LIMITE_BENEFICIARIOS_POR_ANIO} cupos de este año — no se puede agregar otro hasta {anioActual + 1}.</p>
          )}
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <button onClick={guardar} disabled={guardando} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-vino-700 py-2.5 text-sm font-medium text-white hover:bg-vino-600 disabled:opacity-60">
          <Save size={16} />
          {guardando ? "Guardando…" : "Guardar cambios en la lista"}
        </button>
      </div>
    </div>
  );
}