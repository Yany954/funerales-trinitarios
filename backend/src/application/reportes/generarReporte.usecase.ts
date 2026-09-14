import { ServiciosRepository } from "../ports/servicios.repository";
import { ConveniosRepository } from "../ports/convenios.repository";

export type TipoFiltroReporte = "alcaldia" | "convenio" | "sede";

export interface GenerarReporteInput {
  filtroTipo: TipoFiltroReporte;
  filtroValor: string; // convenioId si es alcaldia/convenio; nombre de sede si es sede
  fechaInicio: string;
  fechaFin: string;
}

export interface FilaReporte {
  fecha: Date;
  fallecido: string;
  valor: number;
  descripcion: string;
  usoBoveda: boolean;
}

export async function generarReporte(
  serviciosRepo: ServiciosRepository,
  conveniosRepo: ConveniosRepository,
  input: GenerarReporteInput
): Promise<FilaReporte[]> {
  const fechaInicio = new Date(input.fechaInicio);
  const fechaFin = new Date(input.fechaFin);

  let servicios;
  if (input.filtroTipo === "sede") {
    const convenios = await conveniosRepo.listar();
    const idsInternos = convenios.filter((c) => c.tipo === "interno").map((c) => c.id);
    servicios = await serviciosRepo.buscarPorSedeYConvenios(input.filtroValor, idsInternos, fechaInicio, fechaFin);
  } else {
    servicios = await serviciosRepo.buscarPorConvenio(input.filtroValor, fechaInicio, fechaFin);
  }

  return servicios
    .filter((s) => s.estadoFacturacion === "pendiente por facturar")
    .map((s) => ({
      fecha: s.fechaServicio,
      fallecido: s.fallecido.nombreCompleto,
      valor: s.valorTotal,
      descripcion: s.itemsServicio.map((i) => i.concepto).join(", "),
      usoBoveda: s.usoBoveda.usada,
    }));
}