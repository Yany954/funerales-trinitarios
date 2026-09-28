import { Beneficiario } from "../entities/afiliado";

export function estaRetirado(b: Beneficiario): boolean {
  const ultima = b.novedades?.[b.novedades.length - 1];
  return ultima?.tipo === "retiro";
}