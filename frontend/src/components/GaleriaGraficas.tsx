import { useEffect, useMemo, useState, ReactNode } from "react";
import { Link } from "react-router-dom";
import { collection, onSnapshot, query, where, Timestamp } from "firebase/firestore";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";
import { db } from "../api/client";
import { BarraSegmentada, COLORES_MARCA } from "./BarraSegmentada";
import { aMilisegundos, formatoPesos } from "../utils/formato";
import { ubicacionDe } from "../types";
import type { Afiliado, Servicio, Boveda, Pago, Convenio } from "../types";

const SEDES = ["Pailitas", "Tamalameque", "Pelaya", "Curumaní"] as const;
const MESES_CORTOS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const COLOR = { vino: "#5E2138", buganvilla: "#C2478A", rosa: "#B14E72", oscuro: "#3A1423", ambar: "#B45309", gris: "#8E5A6F" };
const EJE = { fontSize: 12, fill: "#2B2530" };
const pesosCortos = (v: number) => (v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${Math.round(v / 1000)}k`);

/** Últimos `n` meses como claves "aaaa-mm", del más viejo al actual. */
function ultimosMeses(n: number): { clave: string; etiqueta: string }[] {
  const hoy = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - (n - 1 - i), 1);
    return { clave: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, etiqueta: `${MESES_CORTOS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}` };
  });
}
function claveMes(valor: unknown): string | null {
  const ms = aMilisegundos(valor);
  if (ms === undefined) return null;
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Tarjeta de una opción de la galería, numerada para poder elegir. */
function Opcion({ n, titulo, descripcion, children, ancha }: { n: number; titulo: string; descripcion: string; children: ReactNode; ancha?: boolean }) {
  return (
    <section aria-labelledby={`opcion-${n}`} className={`flex flex-col rounded-2xl border border-vino-100 bg-white p-5 ${ancha ? "lg:col-span-2" : ""}`}>
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-vino-700 font-display text-sm text-white" aria-hidden="true">
          {n}
        </span>
        <div>
          <h3 id={`opcion-${n}`} className="font-display text-base text-vino-900">
            <span className="sr-only">Opción {n}: </span>
            {titulo}
          </h3>
          <p className="text-xs text-tinta/70">{descripcion}</p>
        </div>
      </div>
      <div className="flex-1">{children}</div>
    </section>
  );
}

function SinDatos() {
  return <p className="py-10 text-center text-sm text-tinta/70">Todavía no hay datos para esta gráfica.</p>;
}

/**
 * Galería de gráficas para Inicio (solo admin). Cada opción está numerada para
 * escoger cuál(es) dejar. Lee todo una vez y filtra por la sede elegida arriba.
 */
export default function GaleriaGraficas({ sede }: { sede: string }) {
  const [afiliados, setAfiliados] = useState<Afiliado[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [bovedas, setBovedas] = useState<Boveda[]>([]);
  const [pagosMes, setPagosMes] = useState<Pago[]>([]);
  const [pagosSeguroMes, setPagosSeguroMes] = useState<Pago[]>([]);
  const [convenios, setConvenios] = useState<Convenio[]>([]);

  useEffect(() => onSnapshot(query(collection(db, "afiliados")), (s) => setAfiliados(s.docs.map((d) => ({ id: d.id, ...d.data() } as Afiliado))), (e) => console.error(e)), []);
  useEffect(() => {
    const hace12 = new Date();
    hace12.setMonth(hace12.getMonth() - 12, 1);
    return onSnapshot(
      query(collection(db, "servicios"), where("fechaServicio", ">=", Timestamp.fromDate(hace12))),
      (s) => setServicios(s.docs.map((d) => ({ id: d.id, ...d.data() } as Servicio))),
      (e) => console.error(e)
    );
  }, []);
  useEffect(() => onSnapshot(query(collection(db, "bovedas")), (s) => setBovedas(s.docs.map((d) => ({ id: d.id, ...d.data() } as Boveda))), (e) => console.error(e)), []);
  useEffect(() => onSnapshot(query(collection(db, "convenios")), (s) => setConvenios(s.docs.map((d) => ({ id: d.id, ...d.data() } as Convenio))), (e) => console.error(e)), []);
  useEffect(() => {
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);
    const desde = Timestamp.fromDate(inicioMes);
    const u1 = onSnapshot(query(collection(db, "pagos"), where("fecha", ">=", desde)), (s) => setPagosMes(s.docs.map((d) => d.data() as Pago)), (e) => console.error(e));
    const u2 = onSnapshot(query(collection(db, "pagos_seguro_vida"), where("fecha", ">=", desde)), (s) => setPagosSeguroMes(s.docs.map((d) => d.data() as Pago)), (e) => console.error(e));
    return () => {
      u1();
      u2();
    };
  }, []);

  const enSede = <T extends { sede: string }>(lista: T[]) => (sede === "all" ? lista : lista.filter((x) => x.sede === sede));
  const sedesVisibles = sede === "all" ? [...SEDES] : [sede];

  const conPlan = useMemo(() => enSede(afiliados).filter((a) => !a.soloSeguro), [afiliados, sede]);
  const pagan = (a: Afiliado) => a.estadoPlan !== "inactivo";

  // ---------- 0. Dinero esperado por sede ----------
  const esperadoPorSede = useMemo(
    () =>
      sedesVisibles.map((s) => {
        const deSede = afiliados.filter((a) => a.sede === s);
        const planes = deSede.filter((a) => !a.soloSeguro && pagan(a)).reduce((t, a) => t + (a.valorCuotaMensual || 0), 0);
        const seguros = deSede.filter((a) => a.tieneSeguroVida && a.seguroVida).reduce((t, a) => t + (a.seguroVida!.precioMensual || 0), 0);
        return { sede: s, "Cuotas de planes": planes, "Seguros de vida": seguros, total: planes + seguros };
      }),
    [afiliados, sede]
  );
  const totalEsperado = esperadoPorSede.reduce((t, x) => t + x.total, 0);

  // ---------- 1. Afiliados por estado ----------
  const porEstado = [
    { nombre: "Activos", valor: conPlan.filter((a) => a.estadoPlan === "activo").length, color: COLOR.vino },
    { nombre: "En mora", valor: conPlan.filter((a) => a.estadoPlan === "en mora").length, color: COLOR.buganvilla },
    { nombre: "Inactivos", valor: conPlan.filter((a) => a.estadoPlan === "inactivo").length, color: COLOR.gris },
  ];
  const totalAfiliados = conPlan.length;
  const pctMora = totalAfiliados ? Math.round((porEstado[1].valor / totalAfiliados) * 100) : 0;

  // ---------- 2. Recaudo del mes vs esperado ----------
  const recaudo = sedesVisibles.map((s) => {
    const cobrado = [...pagosMes, ...pagosSeguroMes].filter((p) => p.sede === s).reduce((t, p) => t + (p.valor || 0), 0);
    const esperado = esperadoPorSede.find((x) => x.sede === s)?.total ?? 0;
    return { sede: s, cobrado, esperado };
  });

  // ---------- 3. Servicios por mes, por convenio ----------
  const meses12 = ultimosMeses(12);
  const nombreConvenio = (id?: string) => convenios.find((c) => c.id === id)?.nombre ?? "Sin convenio";
  const serviciosSede = enSede(servicios);
  const conveniosEnUso = Array.from(new Set(serviciosSede.map((s) => nombreConvenio(s.convenioId))));
  const serviciosPorMes = meses12.map((m) => {
    const fila: Record<string, string | number> = { mes: m.etiqueta };
    conveniosEnUso.forEach((c) => (fila[c] = 0));
    serviciosSede.filter((s) => claveMes(s.fechaServicio) === m.clave).forEach((s) => (fila[nombreConvenio(s.convenioId)] = Number(fila[nombreConvenio(s.convenioId)]) + 1));
    return fila;
  });

  // ---------- 4. Afiliados por ubicación ----------
  const porUbicacion = Object.entries(
    conPlan.reduce<Record<string, number>>((acc, a) => {
      const u = ubicacionDe(a);
      acc[u] = (acc[u] ?? 0) + 1;
      return acc;
    }, {})
  )
    .map(([ubicacion, afiliados]) => ({ ubicacion, afiliados }))
    .sort((a, b) => b.afiliados - a.afiliados)
    .slice(0, 10);

  // ---------- 5. Bóvedas que vencen (próximos 6 meses) ----------
  const proximos6 = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() + i, 1);
    return { clave: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, etiqueta: `${MESES_CORTOS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}` };
  });
  const bovedasSede = enSede(bovedas);
  const vencidasYa = bovedasSede.filter((b) => b.estado === "vencida").length;
  const bovedasPorMes = proximos6.map((m) => ({ mes: m.etiqueta, bóvedas: bovedasSede.filter((b) => b.estado !== "vencida" && claveMes(b.fechaLimite) === m.clave).length }));

  // ---------- 6. Facturación pendiente por convenio ----------
  const pendientes = Object.entries(
    serviciosSede
      .filter((s) => s.estadoFacturacion === "pendiente por facturar")
      .reduce<Record<string, number>>((acc, s) => {
        const c = nombreConvenio(s.convenioId);
        acc[c] = (acc[c] ?? 0) + (s.valorTotal || 0);
        return acc;
      }, {})
  )
    .map(([convenio, valor]) => ({ convenio, valor }))
    .sort((a, b) => b.valor - a.valor);
  const totalPendiente = pendientes.reduce((t, p) => t + p.valor, 0);

  // ---------- 7. Tarjetas con tendencia (6 meses) ----------
  const meses6 = ultimosMeses(6);
  const serie = (fechas: unknown[]) => meses6.map((m) => ({ mes: m.etiqueta, v: fechas.filter((f) => claveMes(f) === m.clave).length }));
  const conSeguro = enSede(afiliados).filter((a) => a.tieneSeguroVida && a.seguroVida);
  const tarjetas = [
    { titulo: "Afiliados nuevos", serie: serie(conPlan.map((a) => a.fechaAfiliacionReal)), color: COLOR.vino },
    { titulo: "Servicios", serie: serie(serviciosSede.map((s) => s.fechaServicio)), color: COLOR.buganvilla },
    { titulo: "Seguros nuevos", serie: serie(conSeguro.map((a) => a.seguroVida!.fechaInicio)), color: COLOR.rosa },
  ];

  // ---------- 8. Comparación entre sedes ----------
  const comparacion = SEDES.map((s) => {
    const deSede = afiliados.filter((a) => a.sede === s && !a.soloSeguro);
    const mora = deSede.filter((a) => a.estadoPlan === "en mora").length;
    return {
      sede: s,
      Afiliados: deSede.length,
      Servicios: servicios.filter((x) => x.sede === s).length,
      "% en mora": deSede.length ? Math.round((mora / deSede.length) * 100) : 0,
    };
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl text-vino-900">Galería de gráficas</h2>
        <p className="text-sm text-tinta/70">Ideas para la página de Inicio. Cada una tiene un número: dime cuáles se quedan y quito las demás.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* 0 — pedida: dinero esperado por sede */}
        <Opcion n={0} ancha titulo="Dinero que entra al mes, por sede (en teoría)" descripcion="Suma de las cuotas de los afiliados activos y en mora, más los seguros de vida. Es lo que entraría si todos pagan.">
          <p className="mb-3 flex flex-wrap items-baseline gap-2">
            <span className="font-display text-3xl text-vino-900 tabular-nums">{formatoPesos(totalEsperado)}</span>
            <span className="text-sm text-tinta/70">al mes en total</span>
          </p>
          {totalEsperado === 0 ? (
            <SinDatos />
          ) : (
            <div role="img" aria-label={`Dinero esperado por sede: ${esperadoPorSede.map((x) => `${x.sede} ${formatoPesos(x.total)}`).join(", ")}`}>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={esperadoPorSede} layout="vertical" margin={{ left: 16, right: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3DEE6" />
                  <XAxis type="number" tickFormatter={pesosCortos} tick={EJE} />
                  <YAxis type="category" dataKey="sede" tick={EJE} width={90} />
                  <Tooltip formatter={(v: unknown) => formatoPesos(Number(v))} cursor={{ fill: "#FBF2F5" }} />
                  <Legend />
                  <Bar dataKey="Cuotas de planes" stackId="a" fill={COLOR.vino} />
                  <Bar dataKey="Seguros de vida" stackId="a" fill={COLOR.buganvilla} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <ul className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            {esperadoPorSede.map((x) => (
              <li key={x.sede} className="rounded-lg bg-crema px-3 py-2">
                <span className="block text-xs text-tinta/70">{x.sede}</span>
                <span className="font-semibold tabular-nums">{formatoPesos(x.total)}</span>
              </li>
            ))}
          </ul>
        </Opcion>

        {/* 1 — dona por estado */}
        <Opcion n={1} titulo="Afiliados por estado" descripcion="Cuántos están al día, en mora o inactivos. El centro muestra el % en mora.">
          {totalAfiliados === 0 ? (
            <SinDatos />
          ) : (
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <div className="relative h-52 w-52 shrink-0" role="img" aria-label={porEstado.map((p) => `${p.nombre}: ${p.valor}`).join(", ")}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={porEstado} dataKey="valor" nameKey="nombre" innerRadius="62%" outerRadius="100%" paddingAngle={2} stroke="none">
                      {porEstado.map((p) => (
                        <Cell key={p.nombre} fill={p.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-display text-3xl text-vino-900">{pctMora} %</span>
                  <span className="text-xs text-tinta/70">en mora</span>
                </div>
              </div>
              <ul className="w-full space-y-2 text-sm">
                {porEstado.map((p) => (
                  <li key={p.nombre} className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2">
                      <span aria-hidden="true" className="h-3 w-3 rounded-full" style={{ background: p.color }} />
                      {p.nombre}
                    </span>
                    <span className="font-semibold tabular-nums">{p.valor}</span>
                  </li>
                ))}
                <li>
                  <Link to="/afiliados" className="text-xs font-medium text-vino-700 hover:underline">Ver afiliados →</Link>
                </li>
              </ul>
            </div>
          )}
        </Opcion>

        {/* 2 — recaudo del mes */}
        <Opcion n={2} titulo="Cobrado este mes frente a lo esperado" descripcion="Pagos registrados desde el día 1 (planes y seguros), comparados con lo que debería entrar.">
          <ul className="space-y-4">
            {recaudo.map((r) => (
              <li key={r.sede}>
                <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2 text-sm">
                  <span className="font-medium">{r.sede}</span>
                  <span className="tabular-nums text-tinta/70">
                    <span className="font-semibold text-tinta">{formatoPesos(r.cobrado)}</span> de {formatoPesos(r.esperado)}
                    {r.esperado > 0 && ` · ${Math.round((r.cobrado / r.esperado) * 100)} %`}
                  </span>
                </div>
                <BarraSegmentada valor={r.cobrado} total={Math.max(r.esperado, 1)} segmentos={10} etiqueta={`Cobrado en ${r.sede}`} />
              </li>
            ))}
          </ul>
        </Opcion>

        {/* 3 — servicios por mes */}
        <Opcion n={3} ancha titulo="Servicios por mes y convenio (últimos 12 meses)" descripcion="Muestra la temporada y qué convenios traen más servicios.">
          {serviciosSede.length === 0 ? (
            <SinDatos />
          ) : (
            <div role="img" aria-label="Servicios por mes, apilados por convenio">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={serviciosPorMes}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3DEE6" />
                  <XAxis dataKey="mes" tick={EJE} />
                  <YAxis allowDecimals={false} tick={EJE} />
                  <Tooltip cursor={{ fill: "#FBF2F5" }} />
                  <Legend />
                  {conveniosEnUso.map((c, i) => (
                    <Bar key={c} dataKey={c} stackId="s" fill={COLORES_MARCA[i % COLORES_MARCA.length]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Opcion>

        {/* 4 — por ubicación */}
        <Opcion n={4} titulo="Dónde viven los afiliados" descripcion="Las 10 ubicaciones con más afiliados. Ayuda a ver dónde crecer.">
          {porUbicacion.length === 0 ? (
            <SinDatos />
          ) : (
            <div role="img" aria-label={porUbicacion.map((u) => `${u.ubicacion}: ${u.afiliados}`).join(", ")}>
              <ResponsiveContainer width="100%" height={Math.max(200, porUbicacion.length * 30)}>
                <BarChart data={porUbicacion} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <XAxis type="number" allowDecimals={false} tick={EJE} />
                  <YAxis type="category" dataKey="ubicacion" tick={EJE} width={110} />
                  <Tooltip cursor={{ fill: "#FBF2F5" }} />
                  <Bar dataKey="afiliados" fill={COLOR.vino} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Opcion>

        {/* 5 — bóvedas */}
        <Opcion n={5} titulo="Bóvedas que vencen (próximos 6 meses)" descripcion="Para planear exhumaciones y renovaciones con tiempo.">
          {vencidasYa > 0 && (
            <Link to="/bovedas?estado=vencida" className="mb-3 inline-flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800 hover:underline">
              {vencidasYa} ya vencida{vencidasYa === 1 ? "" : "s"} →
            </Link>
          )}
          <div role="img" aria-label={bovedasPorMes.map((b) => `${b.mes}: ${b.bóvedas}`).join(", ")}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={bovedasPorMes}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3DEE6" />
                <XAxis dataKey="mes" tick={EJE} />
                <YAxis allowDecimals={false} tick={EJE} />
                <Tooltip cursor={{ fill: "#FBF2F5" }} />
                <Bar dataKey="bóvedas" fill={COLOR.buganvilla} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Opcion>

        {/* 6 — facturación pendiente */}
        <Opcion n={6} titulo="Lo que deben los convenios" descripcion="Servicios pendientes por facturar, sumados por convenio.">
          <p className="mb-3 flex items-baseline gap-2">
            <span className="font-display text-2xl text-vino-900 tabular-nums">{formatoPesos(totalPendiente)}</span>
            <span className="text-sm text-tinta/70">por facturar</span>
          </p>
          {pendientes.length === 0 ? (
            <SinDatos />
          ) : (
            <ul className="space-y-3">
              {pendientes.map((p) => (
                <li key={p.convenio}>
                  <div className="mb-1 flex justify-between gap-2 text-sm">
                    <span>{p.convenio}</span>
                    <span className="font-semibold tabular-nums">{formatoPesos(p.valor)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-vino-100" aria-hidden="true">
                    <div className="h-2 rounded-full bg-vino-700" style={{ width: `${(p.valor / pendientes[0].valor) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Opcion>

        {/* 7 — tarjetas con tendencia */}
        <Opcion n={7} ancha titulo="Tarjetas con tendencia (6 meses)" descripcion="Un número grande del mes y una mini-gráfica para ver si sube o baja.">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {tarjetas.map((t) => {
              const actual = t.serie[t.serie.length - 1]?.v ?? 0;
              const anterior = t.serie[t.serie.length - 2]?.v ?? 0;
              return (
                <div key={t.titulo} className="rounded-xl border border-vino-100 p-4">
                  <p className="text-xs text-tinta/70">{t.titulo} este mes</p>
                  <p className="flex items-baseline gap-2">
                    <span className="font-display text-2xl text-vino-900 tabular-nums">{actual}</span>
                    <span className={`text-xs font-medium ${actual >= anterior ? "text-green-700" : "text-vino-700"}`}>
                      {actual >= anterior ? "▲" : "▼"} {Math.abs(actual - anterior)} vs. mes pasado
                    </span>
                  </p>
                  <div className="mt-2 h-12" aria-hidden="true">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={t.serie}>
                        <Area type="monotone" dataKey="v" stroke={t.color} fill={t.color} fillOpacity={0.15} strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })}
            <div className="rounded-xl border border-vino-100 p-4">
              <p className="text-xs text-tinta/70">En mora ahora</p>
              <p className="font-display text-2xl text-vino-900 tabular-nums">{porEstado[1].valor}</p>
              <p className="text-xs text-tinta/70">{pctMora} % de los afiliados</p>
              <BarraSegmentada valor={porEstado[1].valor} total={Math.max(totalAfiliados, 1)} segmentos={10} etiqueta="Afiliados en mora" />
            </div>
          </div>
        </Opcion>

        {/* 8 — comparación sedes */}
        <Opcion n={8} ancha titulo="Las 4 sedes lado a lado" descripcion="Afiliados, servicios del último año y % en mora de cada sede (siempre las 4, sin importar el filtro).">
          <div className="grid gap-4 md:grid-cols-3">
            {(["Afiliados", "Servicios", "% en mora"] as const).map((m, i) => (
              <div key={m} role="img" aria-label={`${m} por sede: ${comparacion.map((c) => `${c.sede} ${c[m]}`).join(", ")}`}>
                <p className="mb-1 text-sm font-medium">{m}</p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={comparacion}>
                    <XAxis dataKey="sede" tick={{ ...EJE, fontSize: 11 }} interval={0} />
                    <YAxis allowDecimals={false} tick={EJE} width={32} />
                    <Tooltip cursor={{ fill: "#FBF2F5" }} />
                    <Bar dataKey={m} fill={[COLOR.vino, COLOR.buganvilla, COLOR.ambar][i]} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ))}
          </div>
        </Opcion>
      </div>
    </div>
  );
}
