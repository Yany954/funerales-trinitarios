import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, onSnapshot, query, where, Timestamp } from "firebase/firestore";
import { ArrowRight } from "lucide-react";
import { db } from "../api/client";
import { useRol } from "../auth/RolContext";

export default function Dashboard() {
  const { rol, sedeAsignada, sedeSeleccionada, cargando: cargandoRol } = useRol();
  const sedeActiva = rol === "admin" ? sedeSeleccionada : sedeAsignada;

  const [serviciosMes, setServiciosMes] = useState<number | null>(null);
  const [pendientesFacturar, setPendientesFacturar] = useState<number | null>(null);
  const [bovedasPorVencer, setBovedasPorVencer] = useState<number | null>(null);

  useEffect(() => {
    if (cargandoRol || !sedeActiva) return;
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);
    const condiciones = [where("fechaServicio", ">=", Timestamp.fromDate(inicioMes))];
    if (sedeActiva !== "all") condiciones.push(where("sede", "==", sedeActiva));
    return onSnapshot(
      query(collection(db, "servicios"), ...condiciones),
      (snap) => setServiciosMes(snap.size),
      (err) => { console.error("Error cargando servicios del mes:", err); setServiciosMes(0); }
    );
  }, [sedeActiva, cargandoRol]);

  useEffect(() => {
    if (cargandoRol || !sedeActiva) return;
    const condiciones = [where("estadoFacturacion", "==", "pendiente por facturar")];
    if (sedeActiva !== "all") condiciones.push(where("sede", "==", sedeActiva));
    return onSnapshot(
      query(collection(db, "servicios"), ...condiciones),
      (snap) => setPendientesFacturar(snap.size),
      (err) => { console.error("Error cargando pendientes por facturar:", err); setPendientesFacturar(0); }
    );
  }, [sedeActiva, cargandoRol]);

  useEffect(() => {
    if (cargandoRol || !sedeActiva) return;
    const condiciones = [where("estado", "==", "por vencer")];
    if (sedeActiva !== "all") condiciones.push(where("sede", "==", sedeActiva));
    return onSnapshot(
      query(collection(db, "bovedas"), ...condiciones),
      (snap) => setBovedasPorVencer(snap.size),
      (err) => { console.error("Error cargando bóvedas por vencer:", err); setBovedasPorVencer(0); }
    );
  }, [sedeActiva, cargandoRol]);

  if (cargandoRol) return null;

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-vino-700 p-6 text-crema sm:p-8">
        <h2 className="font-display text-2xl">Bienvenida</h2>
        <p className="mt-1 max-w-md text-sm text-vino-100/85">
          Desde aquí puedes ver los afiliados, registrar servicios y generar
          el resumen de lo pendiente por facturar a cada convenio.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-vino-100 bg-white p-5">
          <p className="text-sm text-tinta/50">Servicios este mes</p>
          <p className="mt-1 font-display text-2xl text-vino-900">{serviciosMes === null ? "…" : serviciosMes}</p>
        </div>

        <Link to="/servicios" className="group rounded-xl border border-vino-100 bg-white p-5 transition-colors hover:border-vino-400">
          <p className="text-sm text-tinta/50">Pendiente por facturar</p>
          <div className="mt-1 flex items-center justify-between">
            <p className="font-display text-2xl text-vino-900">{pendientesFacturar === null ? "…" : pendientesFacturar}</p>
            {!!pendientesFacturar && (
              <span className="flex items-center gap-1 text-xs text-vino-700 opacity-0 transition-opacity group-hover:opacity-100">
                Ver cuáles <ArrowRight size={12} />
              </span>
            )}
          </div>
        </Link>

        <Link to="/bovedas?estado=por vencer" className="group rounded-xl border border-vino-100 bg-white p-5 transition-colors hover:border-vino-400">
          <p className="text-sm text-tinta/50">Bóvedas por vencer</p>
          <div className="mt-1 flex items-center justify-between">
            <p className="font-display text-2xl text-vino-900">{bovedasPorVencer === null ? "…" : bovedasPorVencer}</p>
            {!!bovedasPorVencer && (
              <span className="flex items-center gap-1 text-xs text-vino-700 opacity-0 transition-opacity group-hover:opacity-100">
                Ver cuáles <ArrowRight size={12} />
              </span>
            )}
          </div>
        </Link>
      </div>
    </div>
  );
}