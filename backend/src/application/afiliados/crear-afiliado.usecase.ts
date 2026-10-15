import { Afiliado, BeneficiarioEntrada } from "../../domain/entities/afiliado";
import { MetadataCambio } from "../../domain/value-objects/metadata-cambio";
import { Sede } from "../../domain/value-objects/rol-usuario";
import { AfiliadosRepository } from "../ports/afiliados.repository";
import {
  LIMITE_BENEFICIARIOS_POR_ANIO,
  VALOR_BENEFICIARIO_ADICIONAL,
  contarAdicionalesActivos,
  contarBeneficiariosQueOcupanCupo,
} from "../../domain/value-objects/cupo-beneficiarios";
import { Beneficiario } from "../../domain/entities/afiliado";
export interface CrearAfiliadoInput {
  nombreCompleto: string;
  cedula: string;
  numeroContrato: string;
  sede: Sede;
  planId: string;
  fechaAfiliacionReal: string;
  ubicacion?: string;
  fechaNacimiento?: string;
  valorCuotaMensual: number;
  beneficiarios: BeneficiarioEntrada[];
  tieneSeguroVida: boolean;
  aseguradora?: string;
  observaciones?: string;
}

export async function crearAfiliado(
  repo: AfiliadosRepository,
  input: CrearAfiliadoInput,
  metadata: MetadataCambio,
  limite = LIMITE_BENEFICIARIOS_POR_ANIO
): Promise<Afiliado> {
  if (!input.sede) throw new Error("La sede es obligatoria.");
  if (!input.numeroContrato?.trim()) throw new Error("El número de contrato es obligatorio.");
  if (!input.fechaAfiliacionReal) throw new Error("La fecha de afiliación es obligatoria.");
  if (!input.valorCuotaMensual || input.valorCuotaMensual <= 0) throw new Error("Ingresa el valor de la cuota mensual.");


  const ahora = new Date();
  const beneficiariosConFecha: Beneficiario[] = input.beneficiarios.map((b) => ({
    nombre: b.nombre,
    parentesco: b.parentesco,
    cedula: b.cedula,
    fechaNacimiento: b.fechaNacimiento ? new Date(b.fechaNacimiento) : undefined,
    adicional: b.adicional || undefined,
    fechaAdicion: ahora,
  }));
  const ocupados = contarBeneficiariosQueOcupanCupo(beneficiariosConFecha, ahora.getFullYear());
  if (ocupados > limite) {
    throw new Error(
      `El límite de este plan es de ${limite} beneficiarios por año. Para agregar más, marca el pago de $10.000/mes por beneficiario adicional.`
    );
  }

  const nuevo: Omit<Afiliado, "id"> = {
    nombreCompleto: input.nombreCompleto,
    cedula: input.cedula,
    numeroContrato: input.numeroContrato,
    sede: input.sede,
    planId: input.planId,
    fechaAfiliacionReal: new Date(input.fechaAfiliacionReal),
    valorCuotaMensual: input.valorCuotaMensual + contarAdicionalesActivos(beneficiariosConFecha) * VALOR_BENEFICIARIO_ADICIONAL,
    estadoPlan: "activo",
    fechaAfiliacion: ahora,
    beneficiarios: beneficiariosConFecha,
    fechaNacimiento: input.fechaNacimiento ? new Date(input.fechaNacimiento) : undefined,
    ultimoPago: null,
    tieneSeguroVida: input.tieneSeguroVida,
    aseguradora: input.aseguradora,
    observaciones: input.observaciones,
    ubicacion: input.ubicacion || undefined,
    metadata,
  };

  const creado = await repo.crear(nuevo);
  await repo.sincronizarPersonasCubiertas(creado);
  return creado;
}