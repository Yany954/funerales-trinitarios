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
