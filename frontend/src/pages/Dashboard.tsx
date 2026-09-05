export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-vino-700 p-6 text-crema sm:p-8">
        <h2 className="font-display text-2xl">Bienvenida</h2>
        <p className="mt-1 max-w-md text-sm text-vino-100/85">
          Desde aquí puedes ver los afiliados, registrar servicios y generar
          el resumen de lo pendiente por facturar a cada convenio.
        </p>
      </div>

      {/* TODO: cuando el módulo de reportes esté listo, estas tarjetas van a
          mostrar números reales (servicios del mes, pendientes por facturar
          por convenio, bóvedas próximas a vencer, afiliados en mora). */}
      <div className="grid gap-4 sm:grid-cols-3">
        {["Servicios este mes", "Pendiente por facturar", "Bóvedas por vencer"].map((titulo) => (
          <div key={titulo} className="rounded-xl border border-vino-100 bg-white p-5">
            <p className="text-sm text-tinta/50">{titulo}</p>
            <p className="mt-1 font-display text-2xl text-vino-900">—</p>
          </div>
        ))}
      </div>
    </div>
  );
}
