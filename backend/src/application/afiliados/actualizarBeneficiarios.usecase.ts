import { Afiliado, Beneficiario, BeneficiarioEntrada } from "../../domain/entities/afiliado";
import { MetadataCambio } from "../../domain/value-objects/metadata-cambio";
import { claveBeneficiario } from "../../domain/value-objects/beneficiario-clave";
import { LIMITE_BENEFICIARIOS_POR_ANIO, contarBeneficiariosQueOcupanCupo } from "../../domain/value-objects/cupo-beneficiarios";
import { AfiliadosRepository } from "../ports/afiliados.repository";
import { estaRetirado } from "../../domain/value-objects/estado-beneficiario";
export interface ActualizarBeneficiariosInput {
  afiliadoId: string;
  beneficiarios: BeneficiarioEntrada[];
}

function parsearFecha(valor: string | undefined): Date | undefined {
  if (!valor) return undefined;
  const fecha = new Date(valor);
  if (isNaN(fecha.getTime())) {
    throw new Error(`Fecha de nacimiento inválida: "${valor}". Usa el formato aaaa-mm-dd.`);
  }
  return fecha;
}

export async function actualizarBeneficiarios(
  repo: AfiliadosRepository,
  input: ActualizarBeneficiariosInput,
  metadata: MetadataCambio
): Promise<Afiliado> {
  const actual = await repo.obtenerPorId(input.afiliadoId);
  if (!actual) throw new Error("Ese afiliado no existe.");

  const ahora = new Date();
  const usados = new Set<Beneficiario>();

  // Primero por cédula/clave; si no, por nombre (así corregir una cédula
  // mal digitada no borra la fecha de alta ni las novedades).
  function buscarExistente(entrada: { cedula?: string; nombre: string }): Beneficiario | undefined {
    const porClave = actual!.beneficiarios.find((b) => !usados.has(b) && claveBeneficiario(b) === claveBeneficiario(entrada));
    const encontrado =
      porClave ??
      actual!.beneficiarios.find((b) => !usados.has(b) && b.nombre.trim().toLowerCase() === entrada.nombre.trim().toLowerCase());
    if (encontrado) usados.add(encontrado);
    return encontrado;
  }

  const nuevos: Beneficiario[] = input.beneficiarios.map((entrada) => {
    const existente = buscarExistente(entrada);
    const fechaNacimiento = parsearFecha(entrada.fechaNacimiento) ?? existente?.fechaNacimiento;

    if (existente) {
      return { ...existente, nombre: entrada.nombre, parentesco: entrada.parentesco, cedula: entrada.cedula ?? "", fechaNacimiento };
    }
    return { nombre: entrada.nombre, parentesco: entrada.parentesco, cedula: entrada.cedula ?? "", fechaNacimiento, fechaAdicion: ahora };
  });

  // El historial (fallecidos y retirados/inactivos) nunca se pierde,
  // aunque la lista que llegue no lo incluya.
  const conservados = actual.beneficiarios.filter((b) => !usados.has(b) && (b.fallecido || estaRetirado(b)));
  const beneficiariosNuevos = [...nuevos, ...conservados];

  const ocupados = contarBeneficiariosQueOcupanCupo(beneficiariosNuevos, ahora.getFullYear());
  if (ocupados > LIMITE_BENEFICIARIOS_POR_ANIO) {
    throw new Error(`El límite es de ${LIMITE_BENEFICIARIOS_POR_ANIO} beneficiarios por año. Esta lista tendría ${ocupados}.`);
  }

  const actualizado = await repo.actualizar(input.afiliadoId, { beneficiarios: beneficiariosNuevos, metadata });
  await repo.sincronizarPersonasCubiertas(actualizado);
  return actualizado;
}