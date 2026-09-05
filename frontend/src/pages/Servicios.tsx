import { ClipboardList } from "lucide-react";

/**
 * TODO: construir este módulo siguiendo exactamente el patrón de Afiliados.tsx:
 *  1. Backend: crear application/<modulo>/*.usecase.ts + infrastructure/firebase/<modulo>.repository.firestore.ts
 *  2. Backend: exponer las funciones en interfaces/admin-api/<modulo>.ts y agregarlas a interfaces/index.ts
 *  3. Frontend: agregar las llamadas correspondientes en api/client.ts
 *  4. Frontend: reemplazar este archivo por la pantalla real (lista con DataTable + formulario)
 */
export default function Servicios() {
  return (
    <div className="rounded-xl border border-dashed border-vino-100 bg-white p-10 text-center">
      <ClipboardList className="mx-auto mb-3 text-vino-400" size={28} />
      <p className="font-display text-lg text-vino-900">Módulo de servicios — siguiente paso</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-tinta/60">
        Registrar y consultar cada servicio prestado (fecha, sede, convenio, items, boveda, misa o culto).
      </p>
    </div>
  );
}
