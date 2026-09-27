// Espejo (simplificado) de backend/src/domain/entities — mantener sincronizado
// a mano por ahora; si el proyecto crece, mover a un paquete compartido.

export interface Beneficiario {
  nombre: string;
  parentesco: string;
  cedula: string;
  fechaAdicion?: unknown;
  fallecido?: boolean;
  fechaFallecimiento?: unknown;
  certificadoDefuncionURL?: string;
}

export interface RegistrarFallecimientoBeneficiarioInput {
  afiliadoId: string;
  cedulaBeneficiario: string;
  fechaFallecimiento: string;
  certificadoDefuncionURL: string;
}

export interface Afiliado {
  id: string;
  nombreCompleto: string;
  cedula: string;
  numeroContrato: string;
  planId: string;
  estadoPlan: "activo" | "inactivo" | "en mora";
  beneficiarios: Beneficiario[];
  tieneSeguroVida: boolean;
  sede: Sede;
  anioAfiliacion: number;
  valorCuotaMensual: number;
}
export interface ActualizarAfiliadoInput { 
  id: string; 
  nombreCompleto?: string; 
  cedula?: string; 
  numeroContrato?: string; 
  planId?: string; 
  tieneSeguroVida?: boolean; 
  aseguradora?: string; 
  observaciones?: string; 
  anioAfiliacion: number;
  valorCuotaMensual: number; }

export interface ResultadoBusquedaAfiliado {
  persona: PersonaCubierta;
  afiliado: Afiliado;
}

export interface CrearAfiliadoInput {
  nombreCompleto: string;
  cedula: string;
  numeroContrato: string;
  sede: Sede;
  planId: string;
  beneficiarios: Beneficiario[];
  tieneSeguroVida: boolean;
  aseguradora?: string;
  observaciones?: string;
  anioAfiliacion: number;
}
export interface ActualizarBeneficiariosInput { 
  afiliadoId: string; 
  beneficiarios: Beneficiario[];
 }

export interface PersonaCubierta {
  id: string;
  nombreCompleto: string;
  cedula: string;
  esTitular: boolean;
  parentesco?: string;
  afiliadoId: string;
}

export type Sede = "Pailitas" | "Tamalameque" | "Pelaya" | "Curumaní";

export interface NavItem {
  label: string;
  path: string;
  icon: string; // nombre del ícono de lucide-react
}

export type EstadoBoveda = "vigente" | "por vencer" | "vencida";

export interface Boveda {
  id: string;
  servicioId?: string;
  zona: string;
  fechaInicio: string;   // yyyy-mm-dd
  fechaLimite: string;   // yyyy-mm-dd, calculada por el backend
  valorArriendo: number;
  incluyeExhumacion: boolean;
  estado: EstadoBoveda;
  sede: Sede;
}

export interface RegistrarBovedaInput {
  servicioId?: string;
  zona?: string;
  fechaInicio: string;
  valorArriendo?: number;
  incluyeExhumacion: boolean;
  sede: Sede;
  itemBovedaId?: string;
}
export interface ItemBoveda { id: string; nombre: string; zona: string; precio: number; }
export interface CrearItemBovedaInput { nombre: string; zona: string; precio: number; }
export interface ActualizarItemBovedaInput { id: string; nombre?: string; zona?: string; precio?: number; }

export const VEREDAS_POR_MUNICIPIO: Record<string, string[]> = {
  Pailitas: ["Casco urbano", "Chiriguaná Viejo", "La Aurora", "San Roque"],
  Curumaní: ["Casco urbano", "Rincón Hondo", "Poponte", "Saloa"],
  Chiriguaná: ["Casco urbano", "La Sierra", "Estación Sur"],
  Pelaya: ["Casco urbano", "La Gloria", "Palmira"],
  Tamalameque: ["Casco urbano", "Saloa", "Mata de Palma"],
};
export interface ItemServicio {
  concepto: string;
  cantidad: number;
  valorUnitario: number;
  valorTotal: number;
}

export type TipoServicio = "traslado" | "servicio completo" | "traslado + servicio completo";
export type TipoTraslado = "local" | "fluvial" | "ninguno";
export type EstadoFacturacion = "pendiente por facturar" | "facturado" | "pagado";

export interface Servicio {
  id: string;
  fechaServicio: string; // Timestamp serializado -> string al leer de Firestore en el frontend
  sede: Sede;
  convenioId: string;
  afiliadoId?: string;
  fallecido: { nombreCompleto: string; cedula?: string };
  tipoServicio: TipoServicio;
  tipoTraslado: TipoTraslado;
  usoBoveda: { usada: boolean };
  tuvoMisaOCulto: "misa" | "culto" | "ninguno";
  itemsServicio: ItemServicio[];
  valorTotal: number;
  estadoFacturacion: EstadoFacturacion;
  documentosAdjuntos: string[];
  facturaURL?: string;
  comprobantePagoURL?: string;
  esAfiliado: boolean;
  cedulaTitular?: string;
  tipoPago?: TipoPago;
}
export interface ServicioResumen {
  id: string;
  fechaServicio: string;
  sede: string;
  tipoServicio: string;
  valorTotal: number;
  estadoFacturacion: string;
  facturaURL?: string;
  comprobantePagoURL?: string;
}
export interface RegistrarServicioInput {
  fechaServicio: string;
  sede: Sede;
  convenioId: string;
  afiliadoId?: string;
  fallecido: { nombreCompleto: string; cedula?: string };
  tipoServicio: TipoServicio;
  tipoTraslado: TipoTraslado;
  usaBoveda: boolean;
  tuvoMisaOCulto: "misa" | "culto" | "ninguno";
  itemsServicio: ItemServicio[];
  observaciones?: string;
  esAfiliado: boolean;
  cedulaTitular?: string;
  valorBoveda?: number;
}
export type TipoConvenio = "empresa_exequial" | "alcaldia" | "interno";

export interface Convenio {
  id: string;
  nombre: string;
  tipo: TipoConvenio;
  numeroContrato?: string;
  coberturaGeografica: string[];
}

export interface TarifaConvenio {
  anio: string;
  servicioCompletoBasico: number;
  servicioCompletoSemilujo?: number;
  servicioCompletoLujo?: number;
  iniciales: number;
  finales: number;
  trasladoLocal: number;
  trasladoFluvial: number;
}
export interface DuplicarTarifaInput { convenioId: string; anioOrigen: string; anioDestino: string; }

export interface CrearConvenioInput {
  nombre: string;
  tipo: TipoConvenio;
  numeroContrato?: string;
  coberturaGeografica: string[];
}

export interface GuardarTarifaInput extends TarifaConvenio {
  convenioId: string;
}
export interface ActualizarConvenioInput { id: string; nombre?: string; tipo?: TipoConvenio; numeroContrato?: string; coberturaGeografica?: string[]; }

export type NivelCofre = "basico" | "semilujo" | "lujo";
export type CategoriaCofre = "estandar" | "ancho" | "infantil";

export interface TipoCofre {
  id: string;
  categoria: CategoriaCofre;
  nivel?: NivelCofre;
  tamanoCm?: number;
  referencia: string;
  precio: number;
  fotoURL?: string;
  descripcion?: string;
}
export interface CrearTipoCofreInput { categoria: CategoriaCofre; nivel?: NivelCofre; tamanoCm?: number; referencia: string; precio: number; fotoURL?: string; descripcion?: string; }
export interface ActualizarTipoCofreInput { id: string; categoria?: CategoriaCofre; nivel?: NivelCofre; tamanoCm?: number; referencia?: string; precio?: number; fotoURL?: string; descripcion?: string; }

export interface PlanFunerario { id: string; nombre: string; valorMensual: number; }
export interface CrearPlanInput { nombre: string; valorMensual: number; }
export interface ActualizarPlanInput { id: string; nombre?: string; }
export interface GuardarPrecioAnioInput { planId: string; anio: string; valorMensual: number; }
export interface HistorialPrecioPlan { anio: string; valorMensual: number; planId: string; }

export interface Flor { id: string; nombre: string; fotoURL?: string; precioCosto: number; precioPublico: number; }
export interface CrearFlorInput { nombre: string; precioCosto: number; precioPublico: number; fotoURL?: string; }

export interface InventarioCofre { id: string; sede: string; tipoCofreId: string; cantidadDisponible: number; }
export interface ActualizarInventarioInput { sede: string; tipoCofreId: string; cantidadDisponible: number; }

export type TipoFiltroReporte = "alcaldia" | "convenio" | "sede";

export interface FilaReporte {
  fecha: string;
  fallecido: string;
  valor: number;
  descripcion: string;
  usoBoveda: boolean;
}

export interface GenerarReporteInput {
  filtroTipo: TipoFiltroReporte;
  filtroValor: string;
  fechaInicio: string;
  fechaFin: string;
}
export interface ActualizarServicioInput {
  id: string;
  fechaServicio?: string;
  convenioId?: string;
  fallecido?: { nombreCompleto: string; cedula?: string };
  tipoServicio?: TipoServicio;
  tipoTraslado?: TipoTraslado;
  usaBoveda?: boolean;
  tuvoMisaOCulto?: "misa" | "culto" | "ninguno";
  itemsServicio?: ItemServicio[];
  documentosAdjuntos?: string[];
  observaciones?: string;
  esAfiliado: boolean;
  cedulaTitular?: string;
  valorBoveda?: number;
}
export interface Pago {
  id: string;
  afiliadoId: string;
  sede: Sede;
  fecha: string;
  valor: number;
  periodoCubierto: string;
  comprobanteURL: string;
}

export interface RegistrarPagoInput {
  afiliadoId: string;
  sede: Sede;
  fecha: string;
  valor: number;
  periodoCubierto: string;
  comprobanteURL: string;
}
export type TipoPago = "pendiente" | "convenio_alcaldia" | "afiliado";
export interface ActualizarTipoPagoInput { servicioId: string; tipoPago: TipoPago; }

export interface UsuarioListado { uid: string; email: string; nombre: string; rol: "admin" | "empleado"; sede: string; deshabilitado: boolean; }
export interface CrearUsuarioInput { nombre: string; email: string; rol: "admin" | "empleado"; sede: string; }

export interface ActualizarFlorInput { id: string; nombre?: string; precioCosto?: number; precioPublico?: number; fotoURL?: string; }
export interface CambiarEstadoFacturacionInput {
  servicioId: string;
  nuevoEstado: "facturado" | "pagado";
  facturaURL?: string;
  comprobantePagoURL?: string;
}
export type FiltroReporteMensual = "todos" | "convenioPendienteFacturar" | "facturado" | "facturadoAlcaldia";

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

export interface GenerarReporteMensualInput {
  sede?: string;
  filtro: FiltroReporteMensual;
  fechaInicio: string;
  fechaFin: string;
}
