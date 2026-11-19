import type { InventarioCofre } from "../types";

/** Con esta cantidad o menos, un cofre se marca "pocas unidades" (decisión de Yany). */
export const POCAS_UNIDADES = 2;

export type NivelStock = "agotado" | "pocas" | "ok";

export function nivelStock(cantidad: number): NivelStock {
  if (cantidad <= 0) return "agotado";
  if (cantidad <= POCAS_UNIDADES) return "pocas";
  return "ok";
}

export const ESTILO_STOCK: Record<NivelStock, { etiqueta: string; clase: string }> = {
  agotado: { etiqueta: "Agotado", clase: "bg-red-50 text-red-700" },
  pocas: { etiqueta: "Pocas unidades", clase: "bg-amber-50 text-amber-800" },
  ok: { etiqueta: "Disponible", clase: "bg-green-50 text-green-700" },
};

/** Cantidades por tipo de cofre: total y desglose por sede. */
export function stockPorCofre(inventario: InventarioCofre[]): Record<string, { total: number; porSede: { sede: string; cantidad: number }[] }> {
  const mapa: Record<string, { total: number; porSede: { sede: string; cantidad: number }[] }> = {};
  for (const i of inventario) {
    const fila = (mapa[i.tipoCofreId] ??= { total: 0, porSede: [] });
    fila.total += i.cantidadDisponible;
    fila.porSede.push({ sede: i.sede, cantidad: i.cantidadDisponible });
  }
  return mapa;
}
