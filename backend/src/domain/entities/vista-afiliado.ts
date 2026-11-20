/**
 * Lo que el titular ve en la app ("vista_afiliado/{afiliadoId}").
 *
 * Es una COPIA de solo lectura que arma el backend a partir de "afiliados",
 * "pagos", "pagos_seguro_vida" y "servicios". La fuente de la verdad sigue
 * siendo "afiliados": todo cambio (dashboard, app, mora automática) se guarda
 * allí y un trigger vuelve a armar esta vista. Así el titular ve lo mismo que
 * el dashboard, en tiempo real, pero SIN datos internos: observaciones del
 * staff, quién hizo cada cambio, certificados de defunción, comprobantes ni
 * documentos de los servicios.
 *
 * Todas las fechas son texto ISO en UTC ("aaaa-mm-dd" o ISO completo).
 */
export interface VistaAfiliado {
  afiliadoId: string;
  nombreCompleto: string;
  cedulaParcial: string; // "•••• 4567"
  numeroContrato: string;
  sede: string;
  ubicacion: string; // vereda o la misma sede
  fechaAfiliacion: string | null;
  fechaNacimiento: string | null;
  celular: string | null;
  fotoPerfilURL: string | null;

  /** Plan exequial (null si es titular de solo seguro de vida). */
  plan: {
    nombre: string;
    estado: "activo" | "en mora" | "inactivo";
    cuotaMensual: number;
    cubiertoHasta: string | null; // último día cubierto, "aaaa-mm-dd"
    cupo: { usados: number; limite: number };
    /** Beneficios y condiciones del plan (editables en el dashboard). [] = preguntar en la sede. */
    beneficios: string[];
    beneficiarios: BeneficiarioVista[];
    pagos: PagoVista[]; // los 12 más recientes
  } | null;

  seguroVida: {
    estado: "activo" | "en mora";
    precioMensual: number;
    valorIndemnizacion: number;
    aseguradora: string | null;
    cubiertoHasta: string | null;
    beneficiarios: { nombre: string; parentesco: string; porcentaje: number }[];
    pagos: PagoVista[];
  } | null;

  servicios: ServicioVista[];
  actualizado: string;
}

export interface BeneficiarioVista {
  nombre: string;
  parentesco: string;
  cedulaParcial: string | null;
  estado: "activo" | "retirado" | "fallecido";
  fechaAdicion: string | null;
  fechaNacimiento: string | null;
  adicional: boolean; // paga aparte (+$10.000), no ocupa cupo
}

export interface PagoVista {
  fecha: string | null;
  valor: number;
  periodoCubierto: string;
  numeroRecibo: string | null;
}

export interface ServicioVista {
  fecha: string | null;
  fallecido: string;
  tipoServicio: string;
  valorTotal: number;
  /** "afiliado" = lo cubrió el plan; "convenio_alcaldia" = convenio; "pendiente" = por definir. */
  tipoPago: string | null;
  items: { concepto: string; cantidad: number; valorTotal: number }[];
}
