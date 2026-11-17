import { Afiliado, BeneficiarioSeguro, SeguroVida } from "../../domain/entities/afiliado";
import { MetadataCambio } from "../../domain/value-objects/metadata-cambio";
import { estadoSegunMora, periodoMasReciente } from "../../domain/value-objects/mora";
import { parsearFechaValida } from "../../domain/value-objects/fecha";
import { AfiliadosRepository } from "../ports/afiliados.repository";
import { PagosRepository } from "../ports/pagos.repository";
import { registrarPago } from "../pagos/registrarPago.usecase";
import { Sede } from "../../domain/value-objects/rol-usuario";

/** El titular no puede tener más de esta edad al activar el seguro (los beneficiarios no tienen límite). */
export const EDAD_MAXIMA_TITULAR_SEGURO = 80;

function edadEn(fechaNacimiento: Date, hoy = new Date()): number {
  let edad = hoy.getUTCFullYear() - fechaNacimiento.getUTCFullYear();
  const meses = hoy.getUTCMonth() - fechaNacimiento.getUTCMonth();
  if (meses < 0 || (meses === 0 && hoy.getUTCDate() < fechaNacimiento.getUTCDate())) edad--;
  return edad;
}

/** Lanza un error si el titular tiene más de 80 años. Sin fecha de nacimiento no se puede revisar y se deja pasar. */
export function validarEdadTitularSeguro(fechaNacimiento: Date | undefined): void {
  if (!fechaNacimiento) return;
  const edad = edadEn(fechaNacimiento);
  if (edad > EDAD_MAXIMA_TITULAR_SEGURO) {
    throw new Error(`El titular tiene ${edad} años: el seguro de vida solo se puede tomar hasta los ${EDAD_MAXIMA_TITULAR_SEGURO} años.`);
  }
}
export const MAXIMO_BENEFICIARIOS_SEGURO = 10;

/** Datos del seguro tal como llegan del formulario. */
export interface SeguroVidaEntrada {
  precioMensual: number;
  valorIndemnizacion: number;
  beneficiarios: BeneficiarioSeguro[];
  /** Solo al activar el seguro: fecha de inicio de vigencia (también es la fecha del primer pago). */
  fechaPago?: string;
  /** Solo al editar: corrige la fecha de inicio de vigencia (cambia el día de corte). */
  fechaInicio?: string;
}

export interface GuardarSeguroVidaInput extends SeguroVidaEntrada {
  afiliadoId: string;
}

/** Valida los datos del seguro; `esNuevo` exige además la fecha del primer pago. */
export function validarSeguroVida(entrada: SeguroVidaEntrada | undefined, esNuevo: boolean): void {
  if (!entrada) throw new Error("Completa los datos del seguro de vida.");
  if (!entrada.precioMensual || entrada.precioMensual <= 0) throw new Error("Ingresa el precio mensual del seguro de vida.");
  if (!entrada.valorIndemnizacion || entrada.valorIndemnizacion <= 0) throw new Error("Ingresa el valor de indemnización del seguro.");
  const lista = entrada.beneficiarios ?? [];
  if (lista.length === 0) throw new Error("Agrega al menos un beneficiario del seguro.");
  if (lista.length > MAXIMO_BENEFICIARIOS_SEGURO) {
    throw new Error(`El seguro de vida admite máximo ${MAXIMO_BENEFICIARIOS_SEGURO} beneficiarios.`);
  }
  lista.forEach((b, i) => {
    const quien = lista.length > 1 ? ` ${i + 1}` : "";
    if (!b?.nombre?.trim()) throw new Error(`Ingresa el nombre del beneficiario${quien} del seguro.`);
    if (!b.parentesco?.trim()) throw new Error(`Ingresa el parentesco de ${b.nombre.trim()}.`);
    const sinEdad = b.edad === undefined || b.edad === null;
    if (!sinEdad && (isNaN(b.edad!) || b.edad! < 0)) throw new Error(`La edad de ${b.nombre.trim()} no es válida.`);
    if (!b.porcentaje || isNaN(b.porcentaje) || b.porcentaje <= 0) throw new Error(`Ingresa el porcentaje de ${b.nombre.trim()}.`);
  });
  const suma = lista.reduce((t, b) => t + Number(b.porcentaje), 0);
  if (Math.abs(suma - 100) > 0.01) {
    throw new Error(`Los porcentajes de los beneficiarios deben sumar 100 % (ahora suman ${Math.round(suma * 100) / 100} %).`);
  }
  if (esNuevo) {
    if (!entrada.fechaPago) throw new Error("Ingresa la fecha de inicio de vigencia del seguro.");
    parsearFechaValida(entrada.fechaPago, "fecha de inicio de vigencia");
  }
}

function limpiarBeneficiarios(lista: BeneficiarioSeguro[]): BeneficiarioSeguro[] {
  return lista.map((b) => ({
    nombre: b.nombre.trim(),
    parentesco: b.parentesco.trim(),
    cedula: b.cedula?.trim() || undefined,
    edad: b.edad === undefined || b.edad === null ? undefined : Number(b.edad),
    porcentaje: Number(b.porcentaje),
  }));
}

/** Igual que recalcularAfiliadoDesdePagos, pero para el estado del seguro de vida. */
export async function recalcularSeguroDesdePagos(
  afiliadosRepo: AfiliadosRepository,
  pagosRepo: PagosRepository,
  afiliadoId: string,
  metadata: MetadataCambio
): Promise<void> {
  const afiliado = await afiliadosRepo.obtenerPorId(afiliadoId);
  if (!afiliado?.seguroVida) return;

  const pagos = await pagosRepo.listarPorAfiliado(afiliadoId); // el más reciente primero
  const hasta = periodoMasReciente(pagos);
  const ultimo = pagos[0];
  const seguroVida: SeguroVida = {
    ...afiliado.seguroVida,
    periodoCubiertoHasta: hasta ?? null,
    ultimoPago: ultimo ? { fecha: ultimo.fecha, valor: ultimo.valor, metodo: "registrado" } : null,
    estado: estadoSegunMora(afiliado.seguroVida.fechaInicio, hasta),
  };
  await afiliadosRepo.actualizar(afiliadoId, { seguroVida, metadata });
}

/**
 * Activa o edita el seguro de vida de un afiliado. Al activarlo registra el
 * primer pago (cubre el mes de la fecha de pago).
 */
export async function guardarSeguroVida(
  afiliadosRepo: AfiliadosRepository,
  pagosSeguroRepo: PagosRepository,
  input: GuardarSeguroVidaInput,
  metadata: MetadataCambio
): Promise<Afiliado> {
  const afiliado = await afiliadosRepo.obtenerPorId(input.afiliadoId);
  if (!afiliado) throw new Error("Ese afiliado no existe.");

  const esNuevo = !afiliado.seguroVida;
  validarSeguroVida(input, esNuevo);
  if (esNuevo) validarEdadTitularSeguro(afiliado.fechaNacimiento);

  if (!esNuevo) {
    const fechaInicio = input.fechaInicio
      ? parsearFechaValida(input.fechaInicio, "fecha de inicio de vigencia")
      : afiliado.seguroVida!.fechaInicio;
    await afiliadosRepo.actualizar(input.afiliadoId, {
      tieneSeguroVida: true,
      seguroVida: {
        ...afiliado.seguroVida!,
        precioMensual: input.precioMensual,
        valorIndemnizacion: input.valorIndemnizacion,
        beneficiarios: limpiarBeneficiarios(input.beneficiarios),
        fechaInicio,
      },
      metadata,
    });
    // Otra fecha de afiliación cambia el día de corte → recalcula el estado.
    await recalcularSeguroDesdePagos(afiliadosRepo, pagosSeguroRepo, input.afiliadoId, metadata);
    return (await afiliadosRepo.obtenerPorId(input.afiliadoId))!;
  }

  const fechaInicio = parsearFechaValida(input.fechaPago!, "fecha de inicio de vigencia");
  await afiliadosRepo.actualizar(input.afiliadoId, {
    tieneSeguroVida: true,
    seguroVida: {
      precioMensual: input.precioMensual,
      valorIndemnizacion: input.valorIndemnizacion,
      beneficiarios: limpiarBeneficiarios(input.beneficiarios),
      fechaInicio,
      estado: "activo",
      periodoCubiertoHasta: null,
      ultimoPago: null,
    },
    metadata,
  });

  const periodo = `${fechaInicio.getUTCFullYear()}-${String(fechaInicio.getUTCMonth() + 1).padStart(2, "0")}`;
  await registrarPago(
    pagosSeguroRepo,
    afiliadosRepo,
    {
      afiliadoId: afiliado.id,
      sede: afiliado.sede,
      fecha: input.fechaPago!,
      valor: input.precioMensual,
      periodoCubierto: periodo,
    },
    metadata,
    recalcularSeguroDesdePagos
  );
  return (await afiliadosRepo.obtenerPorId(afiliado.id))!;
}

/** Corre a diario junto con la mora del plan. */
export async function actualizarEstadosMoraSeguros(
  afiliadosRepo: AfiliadosRepository,
  pagosSeguroRepo: PagosRepository,
  metadata: MetadataCambio
): Promise<number> {
  const [afiliados, pagos] = await Promise.all([afiliadosRepo.listarTodos(), pagosSeguroRepo.listarTodos()]);
  const hoy = new Date();
  let actualizados = 0;
  for (const afiliado of afiliados) {
    const seguro = afiliado.seguroVida;
    if (!afiliado.tieneSeguroVida || !seguro) continue;
    const hasta = periodoMasReciente(pagos.filter((p) => p.afiliadoId === afiliado.id));
    const estado = estadoSegunMora(seguro.fechaInicio, hasta, hoy);
    if (estado !== seguro.estado) {
      await afiliadosRepo.actualizar(afiliado.id, { seguroVida: { ...seguro, estado }, metadata });
      actualizados++;
    }
  }
  return actualizados;
}

export interface CrearTitularSeguroInput {
  nombreCompleto: string;
  cedula?: string;
  fechaNacimiento?: string;
  sede: Sede;
  ubicacion?: string;
  seguroVida: SeguroVidaEntrada;
}

/**
 * Crea un titular que solo tiene seguro de vida (sin plan exequial) y le
 * activa el seguro con su primer pago. Se guarda en "afiliados" con
 * soloSeguro = true y estadoPlan "inactivo" para que la mora del plan lo ignore.
 */
export async function crearTitularSeguro(
  afiliadosRepo: AfiliadosRepository,
  pagosSeguroRepo: PagosRepository,
  input: CrearTitularSeguroInput,
  metadata: MetadataCambio
): Promise<Afiliado> {
  if (!input.nombreCompleto?.trim()) throw new Error("Ingresa el nombre del titular.");
  if (!input.sede) throw new Error("La sede es obligatoria.");
  validarSeguroVida(input.seguroVida, true);
  const fechaInicio = parsearFechaValida(input.seguroVida.fechaPago!, "fecha de inicio de vigencia");
  const fechaNacimiento = input.fechaNacimiento ? parsearFechaValida(input.fechaNacimiento, "fecha de nacimiento") : undefined;
  validarEdadTitularSeguro(fechaNacimiento);

  const creado = await afiliadosRepo.crear({
    nombreCompleto: input.nombreCompleto.trim(),
    cedula: input.cedula?.trim() ?? "",
    fechaNacimiento,
    numeroContrato: "",
    sede: input.sede,
    ubicacion: input.ubicacion || undefined,
    planId: "",
    fechaAfiliacionReal: fechaInicio,
    fechaAfiliacion: new Date(),
    valorCuotaMensual: 0,
    estadoPlan: "inactivo",
    beneficiarios: [],
    ultimoPago: null,
    tieneSeguroVida: false, // lo activa guardarSeguroVida junto con el primer pago
    soloSeguro: true,
    metadata,
  });
  return guardarSeguroVida(afiliadosRepo, pagosSeguroRepo, { ...input.seguroVida, afiliadoId: creado.id }, metadata);
}
