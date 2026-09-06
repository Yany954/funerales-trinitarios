// Espejo (simplificado) de backend/src/domain/entities — mantener sincronizado
// a mano por ahora; si el proyecto crece, mover a un paquete compartido.

export interface Beneficiario {
  nombre: string;
  parentesco: string;
  cedula: string;
}

export interface Afiliado {
  id: string;
  nombreCompleto: string;
  cedula: string;
  planId: string;
  estadoPlan: "activo" | "inactivo" | "en mora";
  beneficiarios: Beneficiario[];
  tieneSeguroVida: boolean;
}

export interface CrearAfiliadoInput {
  nombreCompleto: string;
  cedula: string;
  planId: string;
  beneficiarios: Beneficiario[];
  tieneSeguroVida: boolean;
  aseguradora?: string;
  observaciones?: string;
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
  servicioId: string;
  zona: string;
  fechaInicio: string;   // yyyy-mm-dd
  fechaLimite: string;   // yyyy-mm-dd, calculada por el backend
  valorArriendo: number;
  incluyeExhumacion: boolean;
  estado: EstadoBoveda;
}

export interface RegistrarBovedaInput {
  servicioId: string;
  zona: string;
  fechaInicio: string; // tal como lo da un <input type="date">
  valorArriendo: number;
  incluyeExhumacion: boolean;
}
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
}