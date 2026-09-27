// Espejo (simplificado) de backend/src/domain/entities — mantener sincronizado
// a mano por ahora; si el proyecto crece, mover a un paquete compartido.

// ============================================================
// Sedes / navegación
// ============================================================

export type Sede = "Pailitas" | "Tamalameque" | "Pelaya" | "Curumaní";

export const VEREDAS_POR_MUNICIPIO: Record<string, string[]> = {
  Pailitas: ["Las Vegas", "Palestina", "Floresta"],
  Curumaní: ["Sabana Grande", "San Roque"],
  Pelaya: ["Floresta", "Costilla", "San Bernardo"],
  Tamalameque: ["Antequera", "Brisas", "Pasacorriendo"],
};

export interface NavItem {
  label: string;
  path: string;
  icon: string; // nombre del ícono de lucide-react
}

// ============================================================
// Afiliados y beneficiarios
// ============================================================

/** Beneficiario tal como se LEE de un afiliado (incluye historial). */
export interface Beneficiario {
  nombre: string;
  parentesco: string;
  cedula: string;
  fechaNacimiento?: unknown; // Timestamp de Firestore o string ISO, según de dónde llegue
  fechaAdicion?: unknown;
  fallecido?: boolean;
  fechaFallecimiento?: unknown;
  certificadoDefuncionURL?: string;
}

/** Beneficiario tal como se ENVÍA desde un formulario — sin campos que solo maneja el backend. */
export interface BeneficiarioEntrada {
  nombre: string;
  parentesco: string;
  cedula: string;
  fechaNacimiento?: string; // "yyyy-mm-dd"
}

export interface Afiliado {
  id: string;
  nombreCompleto: string;
  cedula: string;
  numeroContrato: string;
  sede: Sede;
  vereda?: string;
  planId: string;
  fechaNacimiento?: unknown;
  fechaAfiliacionReal: unknown;
  valorCuotaMensual: number;
  estadoPlan: "activo" | "inactivo" | "en mora";
  beneficiarios: Beneficiario[];
  tieneSeguroVida: boolean;
}

export interface CrearAfiliadoInput {
  nombreCompleto: string;
  cedula: string;
  numeroContrato: string;
  sede: Sede;
  vereda?: string;
  planId: string;
  fechaNacimiento: string;
  fechaAfiliacionReal: string;
  valorCuotaMensual: number;
  beneficiarios: BeneficiarioEntrada[];
  tieneSeguroVida: boolean;
  aseguradora?: string;
  observaciones?: string;
}

export interface ActualizarAfiliadoInput {
  id: string;
  nombreCompleto?: string;
  cedula?: string;
  numeroContrato?: string;
  planId?: string;
  fechaNacimiento?: string;
  fechaAfiliacionReal?: string;
  valorCuotaMensual?: number;
  tieneSeguroVida?: boolean;
  aseguradora?: string;
  observaciones?: string;
  vereda?: string;
}

export interface ActualizarBeneficiariosInput {
  afiliadoId: string;
  beneficiarios: BeneficiarioEntrada[];
}

export interface RegistrarFallecimientoBeneficiarioInput {
  afiliadoId: string;
  cedulaBeneficiario: string;
  fechaFallecimiento: string;
  certificadoDefuncionURL: string;
}

export interface PersonaCubierta {
  id: string;
  nombreCompleto: string;
  cedula: string;
  esTitular: boolean;
  parentesco?: string;
  afiliadoId: string;
}

export interface ResultadoBusquedaAfiliado {
  persona: PersonaCubierta;
  afiliado: Afiliado;
}

// ============================================================
// Planes funerarios
// ============================================================

export interface PlanFunerario {
  id: string;
  nombre: string;
  valorMensual: number;
}

export interface CrearPlanInput {
  nombre: string;
  valorMensual: number;
}

export interface ActualizarPlanInput {
  id: string;
  nombre?: string;
}

export interface HistorialPrecioPlan {
  planId: string;
  anio: string;
  valorMensual: number;
}

export interface GuardarPrecioAnioInput {
  planId: string;
  anio: string;
  valorMensual: number;
}

// ============================================================
// Convenios y tarifas
// ============================================================

export type TipoConvenio = "empresa_exequial" | "alcaldia" | "interno";

export interface Convenio {
  id: string;
  nombre: string;
  tipo: TipoConvenio;
  numeroContrato?: string;
  coberturaGeografica: string[];
}

export interface CrearConvenioInput {
  nombre: string;
  tipo: TipoConvenio;
  numeroContrato?: string;
  coberturaGeografica: string[];
}

export interface ActualizarConvenioInput {
  id: string;
  nombre?: string;
  tipo?: TipoConvenio;
  numeroContrato?: string;
  coberturaGeografica?: string[];
}

export interface TarifaConvenio {
  anio: string;
  servicioCompletoBasico?: number;
  servicioCompletoSemilujo?: number;
  servicioCompletoLujo?: number;
  iniciales?: number;
  finales?: number;
  trasladoLocal?: number;
  trasladoFluvial?: number;
  precioCofre?: number;
  precioBoveda?: number;
}

export interface GuardarTarifaInput extends TarifaConvenio {
  convenioId: string;
}

export interface DuplicarTarifaInput {
  convenioId: string;
  anioOrigen: string;
  anioDestino: string;
}

// ============================================================
// Cofres
// ============================================================

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

export interface CrearTipoCofreInput {
  categoria: CategoriaCofre;
  nivel?: NivelCofre;
  tamanoCm?: number;
  referencia: string;
  precio: number;
  fotoURL?: string;
  descripcion?: string;
}

export interface ActualizarTipoCofreInput {
  id: string;
  categoria?: CategoriaCofre;
  nivel?: NivelCofre;
  tamanoCm?: number;
  referencia?: string;
  precio?: number;
  fotoURL?: string;
  descripcion?: string;
}

// ============================================================
// Flores
// ============================================================

export interface Flor {
  id: string;
  nombre: string;
  fotoURL?: string;
  precioCosto: number;
  precioPublico: number;
}

export interface CrearFlorInput {
  nombre: string;
  precioCosto: number;
  precioPublico: number;
  fotoURL?: string;
}

export interface ActualizarFlorInput {
  id: string;
  nombre?: string;
  precioCosto?: number;
  precioPublico?: number;
  fotoURL?: string;
}

// ============================================================
// Inventario
// ============================================================

export interface InventarioCofre {
  id: string;
  sede: string;
  tipoCofreId: string;
  cantidadDisponible: number;
}

export interface ActualizarInventarioInput {
  sede: string;
  tipoCofreId: string;
  cantidadDisponible: number;
}

// ============================================================
// Bóvedas
// ============================================================

export type EstadoBoveda = "vigente" | "por vencer" | "vencida";

export interface Boveda {
  id: string;
  sede: Sede;
  servicioId?: string;
  zona: string;
  fechaInicio: string; // yyyy-mm-dd
  fechaLimite: string; // yyyy-mm-dd, calculada por el backend
  valorArriendo: number;
  incluyeExhumacion: boolean;
  estado: EstadoBoveda;
}

export interface RegistrarBovedaInput {
  sede: Sede;
  servicioId?: string;
  zona?: string;
  itemBovedaId?: string;
  valorArriendo?: number;
  fechaInicio: string;
  incluyeExhumacion: boolean;
}

/** Catálogo de precios para bóvedas alquiladas SIN servicio asociado. */
export interface ItemBoveda {
  id: string;
  nombre: string;
  zona: string;
  precio: number;
}

export interface CrearItemBovedaInput {
  nombre: string;
  zona: string;
  precio: number;
}

export interface ActualizarItemBovedaInput {
  id: string;
  nombre?: string;
  zona?: string;
  precio?: number;
}

// ============================================================
// Servicios
// ============================================================

export type TipoServicio = "traslado" | "servicio completo" | "traslado + servicio completo";
export type TipoTraslado = "local" | "fluvial" | "ninguno";
export type EstadoFacturacion = "pendiente por facturar" | "facturado" | "pagado";
export type TipoPago = "pendiente" | "convenio_alcaldia" | "afiliado";

export interface ItemServicio {
  concepto: string;
  cantidad: number;
  valorUnitario: number;
  valorTotal: number;
}

export interface Servicio {
  id: string;
  fechaServicio: string; // Timestamp serializado -> string al leer de Firestore en el frontend
  sede: Sede;
  convenioId: string;
  afiliadoId?: string;
  esAfiliado: boolean;
  cedulaTitular?: string;
  fallecido: { nombreCompleto: string; cedula?: string };
  tipoServicio: TipoServicio;
  tipoTraslado: TipoTraslado;
  usoBoveda: { usada: boolean };
  tuvoMisaOCulto: "misa" | "culto" | "ninguno";
  itemsServicio: ItemServicio[];
  valorTotal: number;
  estadoFacturacion: EstadoFacturacion;
  tipoPago?: TipoPago;
  documentosAdjuntos: string[];
  facturaURL?: string;
  comprobantePagoURL?: string;
}

/** Versión liviana de Servicio, usada en el historial dentro de la ficha del afiliado. */
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
  esAfiliado: boolean;
  cedulaTitular?: string;
  fallecido: { nombreCompleto: string; cedula?: string };
  tipoServicio: TipoServicio;
  tipoTraslado: TipoTraslado;
  usaBoveda: boolean;
  valorBoveda?: number;
  tuvoMisaOCulto: "misa" | "culto" | "ninguno";
  itemsServicio: ItemServicio[];
  observaciones?: string;
}

export interface ActualizarServicioInput {
  id: string;
  fechaServicio?: string;
  convenioId?: string;
  esAfiliado?: boolean;
  cedulaTitular?: string;
  fallecido?: { nombreCompleto: string; cedula?: string };
  tipoServicio?: TipoServicio;
  tipoTraslado?: TipoTraslado;
  usaBoveda?: boolean;
  valorBoveda?: number;
  tuvoMisaOCulto?: "misa" | "culto" | "ninguno";
  itemsServicio?: ItemServicio[];
  documentosAdjuntos?: string[];
  observaciones?: string;
}

// ============================================================
// Facturación
// ============================================================

export interface CambiarEstadoFacturacionInput {
  servicioId: string;
  nuevoEstado: EstadoFacturacion;
  facturaURL?: string;
  comprobantePagoURL?: string;
}

export interface ActualizarTipoPagoInput {
  servicioId: string;
  tipoPago: TipoPago;
}

// ============================================================
// Pagos (mensualidad de afiliados)
// ============================================================

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

// ============================================================
// Reportes
// ============================================================

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

// ============================================================
// Usuarios
// ============================================================

export interface UsuarioListado {
  uid: string;
  email: string;
  nombre: string;
  rol: "admin" | "empleado";
  sede: string;
  deshabilitado: boolean;
}

export interface CrearUsuarioInput {
  nombre: string;
  email: string;
  rol: "admin" | "empleado";
  sede: string;
}