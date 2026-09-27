import { Afiliado, BeneficiarioEntrada } from "../../domain/entities/afiliado";
import { MetadataCambio } from "../../domain/value-objects/metadata-cambio";
import { Sede } from "../../domain/value-objects/rol-usuario";
import { AfiliadosRepository } from "../ports/afiliados.repository";
import { PlanesRepository } from "../ports/planes.repository";
import { LIMITE_BENEFICIARIOS_POR_ANIO, contarBeneficiariosQueOcupanCupo } from "../../domain/value-objects/cupo-beneficiarios";

export interface CrearAfiliadoInput {
  nombreCompleto: string;
  cedula: string;
  numeroContrato: string;
  sede: Sede;
  planId: string;
  anioAfiliacion: number;
  beneficiarios: BeneficiarioEntrada[];
  tieneSeguroVida: boolean;
  aseguradora?: string;
  observaciones?: string;
}

export async function crearAfiliado(
  repo: AfiliadosRepository,
  planesRepo: PlanesRepository,
  input: CrearAfiliadoInput,
  metadata: MetadataCambio
): Promise<Afiliado> {
  if (!input.sede) throw new Error("La sede es obligatoria.");
  if (!input.numeroContrato?.trim()) throw new Error("El número de contrato es obligatorio.");

  const valorCuotaMensual = await planesRepo.obtenerTarifaVigente(input.planId, input.anioAfiliacion);
  if (valorCuotaMensual === null) {
    throw new Error("Ese plan no tiene ninguna tarifa registrada para ese año o anteriores — carga el precio del plan primero en la página de Planes.");
  }

  const ahora = new Date();
  const beneficiariosConFecha = input.beneficiarios.map((b) => ({ ...b, fechaAdicion: ahora }));
  const ocupados = contarBeneficiariosQueOcupanCupo(beneficiariosConFecha, ahora.getFullYear());
  if (ocupados > LIMITE_BENEFICIARIOS_POR_ANIO) {
    throw new Error(`El límite es de ${LIMITE_BENEFICIARIOS_POR_ANIO} beneficiarios por año.`);
  }

  const nuevo: Omit<Afiliado, "id"> = {
    nombreCompleto: input.nombreCompleto,
    cedula: input.cedula,
    numeroContrato: input.numeroContrato,
    sede: input.sede,
    planId: input.planId,
    anioAfiliacion: input.anioAfiliacion,
    valorCuotaMensual,
    estadoPlan: "activo",
    fechaAfiliacion: ahora,
    beneficiarios: beneficiariosConFecha,
    ultimoPago: null,
    tieneSeguroVida: input.tieneSeguroVida,
    aseguradora: input.aseguradora,
    observaciones: input.observaciones,
    metadata,
  };

  const creado = await repo.crear(nuevo);
  await repo.sincronizarPersonasCubiertas(creado);
  return creado;
}