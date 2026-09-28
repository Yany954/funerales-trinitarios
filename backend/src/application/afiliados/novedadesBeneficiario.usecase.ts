import { Afiliado } from "../../domain/entities/afiliado";
import { MetadataCambio } from "../../domain/value-objects/metadata-cambio";
import { estaRetirado } from "../../domain/value-objects/estado-beneficiario";
import { AfiliadosRepository } from "../ports/afiliados.repository";
import { IdentificadorBeneficiario, modificarBeneficiario } from "./modificarBeneficiario";

export interface RegistrarNovedadInput extends IdentificadorBeneficiario {
  tipo: "ingreso" | "retiro";
  fecha: string; // "yyyy-mm-dd"
  motivo?: string;
}

export interface DeshacerNovedadInput extends IdentificadorBeneficiario {
  quitar: "fallecimiento" | "novedad";
}

export async function registrarNovedadBeneficiario(
  repo: AfiliadosRepository,
  input: RegistrarNovedadInput,
  metadata: MetadataCambio
): Promise<Afiliado> {
  const fecha = new Date(input.fecha);
  if (isNaN(fecha.getTime())) throw new Error("La fecha de la novedad no es válida.");

  return modificarBeneficiario(
    repo,
    input,
    metadata,
    (b) => {
      if (b.fallecido) throw new Error("Este beneficiario figura como fallecido.");
      const retirado = estaRetirado(b);
      if (input.tipo === "retiro" && retirado) throw new Error("Este beneficiario ya está retirado.");
      if (input.tipo === "ingreso" && !retirado) throw new Error("Este beneficiario no está retirado, no necesita reingreso.");
      return {
        ...b,
        novedades: [...(b.novedades ?? []), { tipo: input.tipo, fecha, motivo: input.motivo?.trim() || undefined }],
      };
    },
    { verificarCupo: input.tipo === "ingreso" } // reingresar vuelve a ocupar cupo
  );
}

export async function deshacerNovedadBeneficiario(
  repo: AfiliadosRepository,
  input: DeshacerNovedadInput,
  metadata: MetadataCambio
): Promise<Afiliado> {
  return modificarBeneficiario(
    repo,
    input,
    metadata,
    (b) => {
      const copia = { ...b };
      if (input.quitar === "fallecimiento") {
        delete copia.fallecido;
        delete copia.fechaFallecimiento;
        delete copia.certificadoDefuncionURL;
      } else {
        const restantes = (b.novedades ?? []).slice(0, -1); // quita solo el último movimiento
        if (restantes.length) copia.novedades = restantes;
        else delete copia.novedades;
      }
      return copia;
    },
    { verificarCupo: true }
  );
}