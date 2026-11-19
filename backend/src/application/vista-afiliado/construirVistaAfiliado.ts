import { Afiliado, Beneficiario } from "../../domain/entities/afiliado";
import { Pago } from "../../domain/entities/pago";
import { Servicio } from "../../domain/entities/servicio";
import { BeneficiarioVista, PagoVista, ServicioVista, VistaAfiliado } from "../../domain/entities/vista-afiliado";
import { contarBeneficiariosQueOcupanCupo, limiteBeneficiariosDelPlan } from "../../domain/value-objects/cupo-beneficiarios";
import { estaRetirado } from "../../domain/value-objects/estado-beneficiario";
import { cubiertoHasta } from "../../domain/value-objects/mora";
import { enmascararCedula } from "../../domain/value-objects/cedula";

export const PAGOS_EN_VISTA = 12;

/** Date/Timestamp → ISO en UTC. Nunca se manda un Date crudo al cliente. */
function iso(valor: unknown): string | null {
  if (!valor) return null;
  const conToDate = valor as { toDate?: () => Date };
  const fecha = conToDate.toDate ? conToDate.toDate() : (valor as Date);
  return fecha instanceof Date && !isNaN(fecha.getTime()) ? fecha.toISOString() : null;
}

function beneficiario(b: Beneficiario): BeneficiarioVista {
  return {
    nombre: b.nombre,
    parentesco: b.parentesco,
    cedulaParcial: b.cedula?.trim() ? enmascararCedula(b.cedula) : null,
    estado: b.fallecido ? "fallecido" : estaRetirado(b) ? "retirado" : "activo",
    fechaAdicion: iso(b.fechaAdicion),
    fechaNacimiento: iso(b.fechaNacimiento),
    adicional: !!b.adicional,
    // NO va: certificadoDefuncionURL, novedades con motivos internos.
  };
}

function pagos(lista: Pago[]): PagoVista[] {
  return [...lista]
    .sort((a, b) => b.fecha.getTime() - a.fecha.getTime())
    .slice(0, PAGOS_EN_VISTA)
    .map((p) => ({ fecha: iso(p.fecha), valor: p.valor, periodoCubierto: p.periodoCubierto, numeroRecibo: p.numeroRecibo ?? null }));
  // NO va: comprobanteURL, metadata (quién lo registró).
}

function servicio(s: Servicio): ServicioVista {
  return {
    fecha: iso(s.fechaServicio),
    fallecido: s.fallecido?.nombreCompleto ?? "",
    tipoServicio: s.tipoServicio,
    valorTotal: s.valorTotal ?? 0,
    tipoPago: s.tipoPago ?? null,
    items: (s.itemsServicio ?? []).map((i) => ({ concepto: i.concepto, cantidad: i.cantidad, valorTotal: i.valorTotal })),
    // NO va: registro de defunción, documentos, factura, comprobante, observaciones.
  };
}

/**
 * Arma la vista del titular. Función pura: recibe los datos ya leídos y
 * reutiliza las MISMAS reglas del dashboard (cupo y fecha de cobertura).
 */
export function construirVistaAfiliado(datos: {
  afiliado: Afiliado;
  nombrePlan: string | null;
  pagosPlan: Pago[];
  pagosSeguro: Pago[];
  servicios: Servicio[];
  hoy?: Date;
}): VistaAfiliado {
  const { afiliado: a, nombrePlan } = datos;
  const anio = (datos.hoy ?? new Date()).getUTCFullYear();
  const inicioPlan = a.fechaAfiliacionReal ?? a.fechaAfiliacion;

  return {
    afiliadoId: a.id,
    nombreCompleto: a.nombreCompleto,
    cedulaParcial: enmascararCedula(a.cedula),
    numeroContrato: a.numeroContrato ?? "",
    sede: a.sede,
    ubicacion: a.ubicacion || a.sede,
    fechaAfiliacion: iso(inicioPlan),
    fechaNacimiento: iso(a.fechaNacimiento),
    celular: a.celular ?? null,
    fotoPerfilURL: a.fotoPerfilURL ?? null,
    contratoFotos: a.contratoFotos ?? [],

    plan: a.soloSeguro
      ? null
      : {
          nombre: nombrePlan ?? "",
          estado: a.estadoPlan,
          cuotaMensual: a.valorCuotaMensual ?? 0,
          cubiertoHasta: inicioPlan ? cubiertoHasta(inicioPlan, a.periodoCubiertoHasta ?? undefined) : null,
          cupo: {
            usados: contarBeneficiariosQueOcupanCupo(a.beneficiarios ?? [], anio),
            limite: limiteBeneficiariosDelPlan(nombrePlan ?? undefined, a.sede),
          },
          beneficiarios: (a.beneficiarios ?? []).map(beneficiario),
          pagos: pagos(datos.pagosPlan),
        },

    seguroVida:
      a.tieneSeguroVida && a.seguroVida
        ? {
            estado: a.seguroVida.estado,
            precioMensual: a.seguroVida.precioMensual,
            valorIndemnizacion: a.seguroVida.valorIndemnizacion,
            aseguradora: a.aseguradora ?? null,
            cubiertoHasta: a.seguroVida.fechaInicio ? cubiertoHasta(a.seguroVida.fechaInicio, a.seguroVida.periodoCubiertoHasta ?? undefined) : null,
            beneficiarios: (a.seguroVida.beneficiarios ?? []).map((b) => ({ nombre: b.nombre, parentesco: b.parentesco, porcentaje: b.porcentaje })),
            pagos: pagos(datos.pagosSeguro),
          }
        : null,

    servicios: [...datos.servicios]
      .sort((x, y) => (y.fechaServicio?.getTime?.() ?? 0) - (x.fechaServicio?.getTime?.() ?? 0))
      .map(servicio),
    actualizado: new Date().toISOString(),
  };
}
