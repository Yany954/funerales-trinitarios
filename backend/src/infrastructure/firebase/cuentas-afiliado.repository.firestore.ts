import { db, Timestamp } from "./admin";
import { CuentasAfiliadoRepository } from "../../application/ports/cuentas-afiliado.repository";
import { CodigoActivacion, CuentaAfiliado, IntentosRegistro } from "../../domain/entities/cuenta-afiliado";

const CUENTAS = "cuentas_afiliado";
const CODIGOS = "codigos_activacion";
const INTENTOS = "intentos_registro_app";

const aFecha = (v: any): Date | null => (v?.toDate ? v.toDate() : v ?? null);

export class CuentasAfiliadoRepositoryFirestore implements CuentasAfiliadoRepository {
  async obtenerCuenta(afiliadoId: string): Promise<CuentaAfiliado | null> {
    const doc = await db.collection(CUENTAS).doc(afiliadoId).get();
    if (!doc.exists) return null;
    const d = doc.data()!;
    return {
      ...(d as CuentaAfiliado),
      fechaCreacion: aFecha(d.fechaCreacion)!,
      habeasData: { ...d.habeasData, fechaAceptacion: aFecha(d.habeasData?.fechaAceptacion)! },
    };
  }

  async reservarCuenta(cuenta: Omit<CuentaAfiliado, "uid">): Promise<void> {
    try {
      // create() falla si el documento ya existe — es lo que evita registros duplicados.
      await db.collection(CUENTAS).doc(cuenta.afiliadoId).create({
        ...cuenta,
        uid: "",
        fechaCreacion: Timestamp.fromDate(cuenta.fechaCreacion),
        habeasData: { ...cuenta.habeasData, fechaAceptacion: Timestamp.fromDate(cuenta.habeasData.fechaAceptacion) },
      });
    } catch {
      throw new Error("Ya existe una cuenta con esta cédula. Si olvidaste tu PIN, pide en tu sede que restablezcan tu acceso.");
    }
  }

  async confirmarCuenta(afiliadoId: string, uid: string): Promise<void> {
    await db.collection(CUENTAS).doc(afiliadoId).update({ uid });
  }

  async eliminarCuenta(afiliadoId: string): Promise<void> {
    await db.collection(CUENTAS).doc(afiliadoId).delete();
  }

  async guardarCodigo(codigo: CodigoActivacion): Promise<void> {
    await db.collection(CODIGOS).doc(codigo.afiliadoId).set({
      ...codigo,
      expira: Timestamp.fromDate(codigo.expira),
      fechaCreacion: Timestamp.fromDate(codigo.fechaCreacion),
    });
  }

  async obtenerCodigo(afiliadoId: string): Promise<CodigoActivacion | null> {
    const doc = await db.collection(CODIGOS).doc(afiliadoId).get();
    if (!doc.exists) return null;
    const d = doc.data()!;
    return { ...(d as CodigoActivacion), expira: aFecha(d.expira)!, fechaCreacion: aFecha(d.fechaCreacion)! };
  }

  async marcarCodigoUsado(afiliadoId: string): Promise<void> {
    await db.collection(CODIGOS).doc(afiliadoId).update({ usado: true });
  }

  async obtenerIntentos(cedula: string): Promise<IntentosRegistro> {
    const doc = await db.collection(INTENTOS).doc(cedula).get();
    if (!doc.exists) return { fallidos: 0, bloqueadoHasta: null };
    const d = doc.data()!;
    return { fallidos: d.fallidos ?? 0, bloqueadoHasta: aFecha(d.bloqueadoHasta) };
  }

  async guardarIntentos(cedula: string, intentos: IntentosRegistro): Promise<void> {
    await db.collection(INTENTOS).doc(cedula).set({
      fallidos: intentos.fallidos,
      bloqueadoHasta: intentos.bloqueadoHasta ? Timestamp.fromDate(intentos.bloqueadoHasta) : null,
    });
  }

  async limpiarIntentos(cedula: string): Promise<void> {
    await db.collection(INTENTOS).doc(cedula).delete();
  }
}
