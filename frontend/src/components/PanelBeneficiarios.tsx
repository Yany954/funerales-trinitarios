import { useState } from "react";
import { X, Plus, Trash2, Users } from "lucide-react";
import { actualizarBeneficiarios } from "../api/client";
import type { Afiliado, Beneficiario } from "../types";

interface Props {
  afiliado: Afiliado;
  onCerrar: () => void;
}

function filaVacia(): Beneficiario {
  return { nombre: "", parentesco: "", cedula: "" };
}

export default function PanelBeneficiarios({ afiliado, onCerrar }: Props) {
  const [beneficiarios, setBeneficiarios] = useState<Beneficiario[]>(afiliado.beneficiarios ?? []);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function actualizarFila(i: number, campo: keyof Beneficiario, valor: string) {
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
      const validos = beneficiarios.filter((b) => b.nombre.trim() && b.cedula.trim());
      await actualizarBeneficiarios({ afiliadoId: afiliado.id, beneficiarios: validos });
      onCerrar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-tinta/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg text-vino-900">Beneficiarios — {afiliado.nombreCompleto}</h3>
            <p className="text-xs text-tinta/50">Titular, cédula {afiliado.cedula}</p>
          </div>
          <button onClick={onCerrar} className="text-tinta/40 hover:text-tinta"><X size={20} /></button>
        </div>

        <div className="space-y-2">
          {beneficiarios.length === 0 && <p className="text-sm text-tinta/50">Este afiliado todavía no tiene beneficiarios.</p>}
          {beneficiarios.map((b, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_1fr_2rem] gap-2">
              <input placeholder="Nombre" value={b.nombre} onChange={(e) => actualizarFila(i, "nombre", e.target.value)} className="rounded-lg border border-vino-100 px-2 py-1.5 text-sm" />
              <input placeholder="Parentesco" value={b.parentesco} onChange={(e) => actualizarFila(i, "parentesco", e.target.value)} className="rounded-lg border border-vino-100 px-2 py-1.5 text-sm" />
              <input placeholder="Cédula" value={b.cedula} onChange={(e) => actualizarFila(i, "cedula", e.target.value)} className="rounded-lg border border-vino-100 px-2 py-1.5 text-sm" />
              <button onClick={() => setBeneficiarios((prev) => prev.filter((_, idx) => idx !== i))} className="text-tinta/40 hover:text-red-600">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <button onClick={() => setBeneficiarios((prev) => [...prev, filaVacia()])} className="flex items-center gap-1.5 text-sm text-vino-700 hover:underline">
            <Plus size={14} /> Agregar beneficiario
          </button>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <button onClick={guardar} disabled={guardando} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-vino-700 py-2.5 text-sm font-medium text-white hover:bg-vino-600 disabled:opacity-60">
          <Users size={16} />
          {guardando ? "Guardando…" : "Guardar beneficiarios"}
        </button>
      </div>
    </div>
  );
}