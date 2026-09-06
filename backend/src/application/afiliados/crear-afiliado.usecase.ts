import { Afiliado } from "../../domain/entities/afiliado";
import { Sede } from "../../domain/entities/servicio";
import { MetadataCambio } from "../../domain/value-objects/metadata-cambio";
import { AfiliadosRepository } from "../ports/afiliados.repository";

export interface CrearAfiliadoInput {
  nombreCompleto: string;
  cedula: string;
  planId: string;
  sede: Sede;
  beneficiarios: Afiliado["beneficiarios"];
  tieneSeguroVida: boolean;
  aseguradora?: string;
  observaciones?: string;
}

/**
 * Caso de uso: crear un afiliado nuevo.
 * `metadata` la recibe ya construida (con metadataHumano/metadataIA) desde
 * la capa interfaces/ — el caso de uso no decide quién hizo el cambio,
 * solo lo persiste.
 */
export async function crearAfiliado(
  repo: AfiliadosRepository,
  input: CrearAfiliadoInput,
  metadata: MetadataCambio
): Promise<Afiliado> {
  const nuevo: Omit<Afiliado, "id"> = {
    nombreCompleto: input.nombreCompleto,
    cedula: input.cedula,
    planId: input.planId,
    estadoPlan: "activo",
    fechaAfiliacion: new Date(),
    beneficiarios: input.beneficiarios,
    ultimoPago: null,
    tieneSeguroVida: input.tieneSeguroVida,
    aseguradora: input.aseguradora,
    observaciones: input.observaciones,
    metadata,
    sede: input.sede,
  };

  const creado = await repo.crear(nuevo);

  // Mantiene la colección personas_cubiertas sincronizada (titular + beneficiarios)
  // para que la búsqueda por nombre/cédula funcione sin importar quién pregunte.
  await repo.sincronizarPersonasCubiertas(creado);

  return creado;
}
