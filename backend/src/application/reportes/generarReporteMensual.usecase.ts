import { ServiciosRepository } from "../ports/servicios.repository";
import { ConveniosRepository } from "../ports/convenios.repository";

export type FiltroReporteMensual =
  | "todos"
  | "convenioPendienteFacturar"
  | "facturado"
  | "facturadoAlcaldia";

export interface GenerarReporteMensualInput {
  sede?: string; // omitido o "all" = todas
  filtro: FiltroReporteMensual;
  fechaInicio: string;
  fechaFin: string;
}

export interface FilaReporteMensual {
  id: string;
  fecha: string;
  sede: string;
  convenio: string;
  fallecido: string;
  servicioPrestado: string;
  boveda: boolean;
  valorTotal: number;
  estadoFacturacion: string;
}

export async function generarReporteMensual(
  serviciosRepo: ServiciosRepository,
  conveniosRepo: ConveniosRepository,
  input: GenerarReporteMensualInput
): Promise<FilaReporteMensual[]> {
  const desde = new Date(input.fechaInicio);
  const hasta = new Date(input.fechaFin);
  const sedeFiltro = input.sede && input.sede !== "all" ? input.sede : undefined;

  const [servicios, convenios] = await Promise.all([
    serviciosRepo.buscarPorRangoFechas(desde, hasta, sedeFiltro),
    conveniosRepo.listar(),
  ]);
  const mapaConvenios = new Map(convenios.map((c) => [c.id, c]));

  const filtrados = servicios.filter((s) => {
    const convenio = s.convenioId ? mapaConvenios.get(s.convenioId) : null;
    switch (input.filtro) {
      case "convenioPendienteFacturar":
        return !!convenio && s.estadoFacturacion === "pendiente por facturar";
      case "facturado":
        return s.estadoFacturacion === "facturado";
      case "facturadoAlcaldia":
        return s.estadoFacturacion === "facturado" && convenio?.tipo === "alcaldia";
      case "todos":
      default:
        return true; // incluye TODOS los servicios sin excepción, sin importar estado
    }
  });

  return filtrados
    .sort((a, b) => a.fechaServicio.getTime() - b.fechaServicio.getTime())
    .map((s) => ({
      id: s.id,
      fecha: s.fechaServicio.toISOString(),
      sede: s.sede,
      convenio: s.convenioId ? mapaConvenios.get(s.convenioId)?.nombre ?? "Convenio eliminado" : "Sin convenio (afiliado/particular)",
      fallecido: s.fallecido.nombreCompleto,
      servicioPrestado: s.tipoServicio,
      boveda: s.usoBoveda.usada,
      valorTotal: s.valorTotal,
      estadoFacturacion: s.estadoFacturacion,
    }));
}