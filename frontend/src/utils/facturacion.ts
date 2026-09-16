import type { Convenio, Servicio } from "../types";

export function requiereFactura(convenio: Convenio | null): boolean {
  return convenio?.tipo !== "alcaldia";
}

export function requiereComprobantePago(servicio: Servicio, convenio: Convenio | null): boolean {
  if (convenio?.tipo === "alcaldia") return false;
  if (servicio.afiliadoId && servicio.valorTotal === 0) return false;
  return true;
}