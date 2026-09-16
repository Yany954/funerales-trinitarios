import { ServiciosRepository } from "../ports/servicios.repository";
import { ConveniosRepository } from "../ports/convenios.repository";
import { Servicio } from "../../domain/entities/servicio";

export type TipoFiltroReporte = "alcaldia" | "convenio" | "sede";

export interface GenerarReporteInput {
  filtroTipo: TipoFiltroReporte;
  filtroValor: string;
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

function mapearFilas(servicios: Servicio[]): FilaReporte[] {
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

export async function generarReporte(
  serviciosRepo: ServiciosRepository,
  conveniosRepo: ConveniosRepository,
  input: GenerarReporteInput
): Promise<FilaReporte[]> {
  const fechaInicio = new Date(input.fechaInicio);
  const fechaFin = new Date(input.fechaFin);

  if (input.filtroTipo === "sede") {
    const [servicios, convenios] = await Promise.all([
      serviciosRepo.buscarPorSede(input.filtroValor, fechaInicio, fechaFin),
      conveniosRepo.listar(),
    ]);
    const tipoPorConvenio = new Map(convenios.map((c) => [c.id, c.tipo]));
    // Cuenta como "de sede" cualquier servicio SIN convenio asignado, o cuyo
    // convenio sea explícitamente interno — así no depende de que hayas
    // precargado un convenio "Afiliados" para que funcione.
    const deSede = servicios.filter(
      (s) => !s.convenioId || tipoPorConvenio.get(s.convenioId) === "interno"
    );
    return mapearFilas(deSede);
  }

  const servicios = await serviciosRepo.buscarPorConvenio(input.filtroValor, fechaInicio, fechaFin);
  return mapearFilas(servicios);
}