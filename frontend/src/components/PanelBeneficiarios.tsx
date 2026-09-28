import { useState } from "react";
import { X, Plus, Trash2, HeartCrack, UserMinus, Undo2, Save } from "lucide-react";
import {
  actualizarBeneficiarios,
  registrarFallecimientoBeneficiario,
  registrarNovedadBeneficiario,
  deshacerNovedadBeneficiario,
} from "../api/client";
import SubirDocumento from "./SubirDocumento";
import { formatoFecha, calcularEdad } from "../utils/formato";
import { contarBeneficiariosQueOcupanCupo, estaRetirado, LIMITE_BENEFICIARIOS_POR_ANIO } from "../utils/cupoBeneficiarios";
import { confirmarAccion } from "../utils/confirmar";
import { PARENTESCOS } from "../utils/parentescos";
import type { Afiliado, Beneficiario } from "../types";

interface Props {
  afiliado: Afiliado;
  onCerrar: () => void;
}

type Modo = "fallecimiento" | "novedad";

function aInputDate(valor: unknown): string {
  if (!valor) return "";
  const conToDate = valor as { toDate?: () => Date };
  const fecha = conToDate?.toDate ? conToDate.toDate() : new Date(valor as string);
  return isNaN(fecha.getTime()) ? "" : fecha.toISOString().slice(0, 10);
}

export default function PanelBeneficiarios({ afiliado, onCerrar }: Props) {
  const [beneficiarios, setBeneficiarios] = useState<Beneficiario[]>(afiliado.beneficiarios ?? []);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [abierto, setAbierto] = useState<{ i: number; modo: Modo } | null>(null);
  const [fecha, setFecha] = useState("");
  const [certificadoURL, setCertificadoURL] = useState<string[]>([]);
  const [motivo, setMotivo] = useState("");
  const [procesando, setProcesando] = useState(false);

  const anioActual = new Date().getFullYear();
  const cupoUsado = contarBeneficiariosQueOcupanCupo(beneficiarios, anioActual);

  function actualizarFila(i: number, campo: "nombre" | "parentesco" | "cedula" | "fechaNacimiento", valor: string) {
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
        .filter((b) => b.nombre.trim())
        .map((b) => ({
          nombre: b.nombre,
          parentesco: b.parentesco,
          cedula: b.cedula ?? "",
          fechaNacimiento: aInputDate(b.fechaNacimiento) || undefined,
        }));
      await actualizarBeneficiarios({ afiliadoId: afiliado.id, beneficiarios: validos });
      onCerrar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  }

  function identificador(b: Beneficiario) {
    return { afiliadoId: afiliado.id, cedulaBeneficiario: b.cedula ?? "", nombreBeneficiario: b.nombre };
  }

  function abrirForm(i: number, modo: Modo) {
    setAbierto({ i, modo });
    setFecha("");
    setCertificadoURL([]);
    setMotivo("");
    setError(null);
  }

  async function ejecutar(accion: () => Promise<Afiliado>) {
    setError(null);
    setProcesando(true);
    try {
      const actualizado = await accion();
      setBeneficiarios((prev) => [...actualizado.beneficiarios, ...prev.filter((b) => !b.fechaAdicion)]);
      setAbierto(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo completar la acción.");
    } finally {
      setProcesando(false);
    }
  }

  function confirmarFallecimiento(b: Beneficiario) {
    if (!fecha || certificadoURL.length === 0) {
      setError("Ingresa la fecha de fallecimiento y adjunta el certificado de defunción.");
      return;
    }
    ejecutar(() =>
      registrarFallecimientoBeneficiario({ ...identificador(b), fechaFallecimiento: fecha, certificadoDefuncionURL: certificadoURL[0] })
    );
  }

  function confirmarNovedad(b: Beneficiario) {
    if (!fecha) {
      setError("Ingresa la fecha de la novedad.");
      return;
    }
    const tipo = estaRetirado(b) ? "ingreso" : "retiro";
    ejecutar(() => registrarNovedadBeneficiario({ ...identificador(b), tipo, fecha, motivo: motivo.trim() || undefined }));
  }

  async function deshacer(b: Beneficiario, quitar: "fallecimiento" | "novedad") {
    const ok = await confirmarAccion(
      quitar === "fallecimiento" ? "¿Deshacer el fallecimiento?" : "¿Revertir el último movimiento?",
      quitar === "fallecimiento" ? `${b.nombre} volverá a figurar como beneficiario.` : `Se elimina el último ingreso o retiro registrado de ${b.nombre}.`,
      "Sí, deshacer"
    );
    if (!ok) return;
    ejecutar(() => deshacerNovedadBeneficiario({ ...identificador(b), quitar }));
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
          <button onClick={onCerrar} className="text-tinta/40 hover:text-tinta">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3">
          {beneficiarios.length === 0 && <p className="text-sm text-tinta/50">Este afiliado todavía no tiene beneficiarios.</p>}

          {beneficiarios.map((b, i) => {
            const retirado = estaRetirado(b);
            const bloqueado = !!b.fallecido || retirado;
            const guardado = !!b.fechaAdicion; // las filas nuevas todavía no existen en el servidor
            return (
              <div
                key={i}
                className={`rounded-lg border p-3 ${b.fallecido ? "border-red-100 bg-red-50/30" : retirado ? "border-amber-100 bg-amber-50/30" : "border-vino-100"}`}
              >
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_1fr_9rem_2rem]">
                  <input placeholder="Nombre" value={b.nombre} disabled={bloqueado} onChange={(e) => actualizarFila(i, "nombre", e.target.value)} className="w-full rounded-lg border border-vino-100 px-2 py-1.5 text-sm disabled:bg-vino-50" />
                  <select value={b.parentesco} disabled={bloqueado} onChange={(e) => actualizarFila(i, "parentesco", e.target.value)} className="w-full rounded-lg border border-vino-100 px-2 py-1.5 text-sm disabled:bg-vino-50">
                    <option value="">Parentesco…</option>
                    {PARENTESCOS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                    {b.parentesco && !(PARENTESCOS as readonly string[]).includes(b.parentesco) && <option value={b.parentesco}>{b.parentesco}</option>}
                  </select>
                  <input placeholder="Cédula (opcional)" value={b.cedula ?? ""} disabled={bloqueado} onChange={(e) => actualizarFila(i, "cedula", e.target.value)} className="w-full rounded-lg border border-vino-100 px-2 py-1.5 text-sm disabled:bg-vino-50" />
                  <input type="date" value={aInputDate(b.fechaNacimiento)} disabled={bloqueado} onChange={(e) => actualizarFila(i, "fechaNacimiento", e.target.value)} className="w-full rounded-lg border border-vino-100 px-2 py-1.5 text-sm disabled:bg-vino-50" />
                  {!bloqueado && (
                    <button onClick={() => setBeneficiarios((prev) => prev.filter((_, idx) => idx !== i))} className="flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs text-red-600 hover:bg-red-50 sm:text-transparent">
                      <Trash2 size={16} className="shrink-0" /> <span className="sm:hidden">Quitar beneficiario</span>
                    </button>
                  )}
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-tinta/50">
                  {b.fechaAdicion ? <span>Ingreso: {formatoFecha(b.fechaAdicion)}</span> : null}
                  {b.fechaNacimiento ? <span>Edad: {calcularEdad(b.fechaNacimiento)} años</span> : null}

                  {b.fallecido ? (
                    <span className="flex flex-wrap items-center gap-1 text-red-700">
                      <HeartCrack size={12} /> Fallecido {formatoFecha(b.fechaFallecimiento)}
                      {b.certificadoDefuncionURL && (
                        <a href={b.certificadoDefuncionURL} target="_blank" rel="noreferrer" className="underline">Ver certificado</a>
                      )}
                      <button onClick={() => deshacer(b, "fallecimiento")} className="ml-1 flex items-center gap-1 text-vino-700 underline">
                        <Undo2 size={12} /> Deshacer
                      </button>
                    </span>
                  ) : (
                    guardado && (
                      <>
                        <button onClick={() => abrirForm(i, "novedad")} className="text-vino-700 hover:underline">
                          {retirado ? "Registrar ingreso" : "Registrar retiro"}
                        </button>
                        {!retirado && (
                          <button onClick={() => abrirForm(i, "fallecimiento")} className="text-vino-700 hover:underline">Registrar fallecimiento</button>
                        )}
                      </>
                    )
                  )}
                </div>

                {!!b.novedades?.length && (
                  <div className={`mt-1.5 space-y-0.5 text-xs ${retirado ? "text-amber-700" : "text-tinta/50"}`}>
                    {b.novedades.map((n, k) => (
                      <p key={k} className="flex flex-wrap items-center gap-1">
                        <UserMinus size={12} />
                        {n.tipo === "retiro" ? "Retiro" : "Reingreso"} el {formatoFecha(n.fecha)}
                        {n.motivo ? ` — ${n.motivo}` : ""}
                        {k === b.novedades!.length - 1 && (
                          <button onClick={() => deshacer(b, "novedad")} className="ml-1 flex items-center gap-1 text-vino-700 underline">
                            <Undo2 size={12} /> Revertir
                          </button>
                        )}
                      </p>
                    ))}
                  </div>
                )}

                {abierto?.i === i && abierto.modo === "fallecimiento" && (
                  <div className="mt-2 space-y-2 rounded-lg bg-vino-50 p-3">
                    <p className="text-xs font-medium text-vino-900">Novedad de fallecimiento</p>
                    <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full rounded-lg border border-vino-100 px-2 py-1.5 text-sm sm:w-auto" />
                    <SubirDocumento carpeta={`afiliados/${afiliado.sede}/${afiliado.id}`} documentos={certificadoURL} onCambiar={setCertificadoURL} />
                    <div className="flex gap-2">
                      <button onClick={() => confirmarFallecimiento(b)} disabled={procesando} className="rounded-lg bg-vino-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-vino-600 disabled:opacity-60">
                        {procesando ? "Guardando…" : "Confirmar"}
                      </button>
                      <button onClick={() => setAbierto(null)} className="rounded-lg border border-vino-100 px-3 py-1.5 text-xs text-tinta/60">Cancelar</button>
                    </div>
                  </div>
                )}

                {abierto?.i === i && abierto.modo === "novedad" && (
                  <div className="mt-2 space-y-2 rounded-lg bg-vino-50 p-3">
                    <p className="text-xs font-medium text-vino-900">
                      Novedad: {retirado ? "INGRESO (vuelve a ser beneficiario)" : "RETIRO (deja de ser beneficiario)"}
                    </p>
                    <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full rounded-lg border border-vino-100 px-2 py-1.5 text-sm sm:w-auto" />
                    <input placeholder="Motivo (opcional, ej. separación)" value={motivo} onChange={(e) => setMotivo(e.target.value)} className="w-full rounded-lg border border-vino-100 px-2 py-1.5 text-sm" />
                    <p className="text-xs text-tinta/50">
                      {retirado ? "Volverá a ocupar un cupo." : "Se conserva toda su información y se libera un cupo."}
                    </p>
                    <div className="flex gap-2">
                      <button onClick={() => confirmarNovedad(b)} disabled={procesando} className="rounded-lg bg-vino-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-vino-600 disabled:opacity-60">
                        {procesando ? "Guardando…" : "Confirmar"}
                      </button>
                      <button onClick={() => setAbierto(null)} className="rounded-lg border border-vino-100 px-3 py-1.5 text-xs text-tinta/60">Cancelar</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {cupoUsado < LIMITE_BENEFICIARIOS_POR_ANIO ? (
            <button onClick={() => setBeneficiarios((prev) => [...prev, { nombre: "", parentesco: "", cedula: "" }])} className="flex items-center gap-1.5 text-sm text-vino-700 hover:underline">
              <Plus size={14} /> Agregar beneficiario
            </button>
          ) : (
            <p className="text-xs text-amber-700">
              Ya se usaron los {LIMITE_BENEFICIARIOS_POR_ANIO} cupos de este año — para agregar otro, registra el retiro de alguno.
            </p>
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