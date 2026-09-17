import { db, Timestamp } from "./admin";
import { Afiliado, PersonaCubierta } from "../../domain/entities/afiliado";
import { AfiliadosRepository } from "../../application/ports/afiliados.repository";
import { MetadataCambio } from "../../domain/value-objects/metadata-cambio";

const AFILIADOS = "afiliados";
const PERSONAS_CUBIERTAS = "personas_cubiertas";

/** Convierte fechas JS <-> Timestamp de Firestore al leer/escribir. */
function aFirestore(afiliado: Omit<Afiliado, "id">) {
  return {
    ...afiliado,
    fechaAfiliacion: Timestamp.fromDate(afiliado.fechaAfiliacion),
    ultimoPago: afiliado.ultimoPago
      ? { ...afiliado.ultimoPago, fecha: Timestamp.fromDate(afiliado.ultimoPago.fecha) }
      : null,
    metadata: { ...afiliado.metadata, fecha: Timestamp.fromDate(afiliado.metadata.fecha) },
  };
}

function deFirestore(id: string, data: FirebaseFirestore.DocumentData): Afiliado {
  return {
    id,
    ...data,
    fechaAfiliacion: data.fechaAfiliacion.toDate(),
    ultimoPago: data.ultimoPago
      ? { ...data.ultimoPago, fecha: data.ultimoPago.fecha.toDate() }
      : null,
    metadata: { ...data.metadata, fecha: data.metadata.fecha.toDate() },
  } as Afiliado;
}

export class AfiliadosRepositoryFirestore implements AfiliadosRepository {
  async crear(afiliado: Omit<Afiliado, "id">): Promise<Afiliado> {
    const ref = await db.collection(AFILIADOS).add(aFirestore(afiliado));
    return { id: ref.id, ...afiliado };
  }

  async obtenerPorId(id: string): Promise<Afiliado | null> {
    const doc = await db.collection(AFILIADOS).doc(id).get();
    if (!doc.exists) return null;
    return deFirestore(doc.id, doc.data()!);
  }

  async sincronizarPersonasCubiertas(afiliado: Afiliado): Promise<void> {
    const batch = db.batch();

    const titularRef = db.collection(PERSONAS_CUBIERTAS).doc(`titular_${afiliado.id}`);
    batch.set(titularRef, {
      nombreCompleto: afiliado.nombreCompleto,
      nombreBusqueda: afiliado.nombreCompleto.toLowerCase(),
      cedula: afiliado.cedula,
      esTitular: true,
      afiliadoId: afiliado.id,
    });

    // Borra los beneficiarios anteriores antes de recrear — así, si editaste
    // y quitaste alguno, no queda un registro huérfano todavía buscable.
    const existentes = await db.collection(PERSONAS_CUBIERTAS)
      .where("afiliadoId", "==", afiliado.id)
      .where("esTitular", "==", false)
      .get();
    existentes.docs.forEach((d) => batch.delete(d.ref));

    afiliado.beneficiarios.forEach((beneficiario, i) => {
      const ref = db.collection(PERSONAS_CUBIERTAS).doc(`beneficiario_${afiliado.id}_${i}`);
      batch.set(ref, {
        nombreCompleto: beneficiario.nombre,
        nombreBusqueda: beneficiario.nombre.toLowerCase(),
        cedula: beneficiario.cedula,
        esTitular: false,
        parentesco: beneficiario.parentesco,
        afiliadoId: afiliado.id,
      });
    });

    await batch.commit();
  }

  async buscarPersonaCubiertaPorNombreOCedula(termino: string): Promise<PersonaCubierta[]> {
    // Búsqueda por cédula: coincidencia exacta (rápida, con índice automático).
    const porCedula = await db
      .collection(PERSONAS_CUBIERTAS)
      .where("cedula", "==", termino)
      .get();

    if (!porCedula.empty) {
      return porCedula.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PersonaCubierta, "id">) }));
    }

    // Búsqueda por nombre: Firestore no tiene "contains" nativo, así que se usa
    // un rango de prefijo (sirve para "empieza con"). Para búsqueda difusa completa,
    // considerar Algolia/Typesense más adelante si el volumen de afiliados crece mucho.
    const terminoNormalizado = termino.toLowerCase();
    const porNombre = await db
      .collection(PERSONAS_CUBIERTAS)
      .orderBy("nombreBusqueda")
      .startAt(terminoNormalizado)
      .endAt(terminoNormalizado + "\uf8ff")
      .get();

    return porNombre.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PersonaCubierta, "id">) }));
  }
  async listarTodos(): Promise<Afiliado[]> {
    const snap = await db.collection(AFILIADOS).get();
    return snap.docs.map((d) => deFirestore(d.id, d.data()));
  }

  async actualizarEstadoPlan(id: string, estado: Afiliado["estadoPlan"], metadata: MetadataCambio): Promise<void> {
    await db.collection(AFILIADOS).doc(id).update({
      estadoPlan: estado,
      metadata: { ...metadata, fecha: Timestamp.fromDate(metadata.fecha) },
    });
  }

  async actualizarUltimoPago(
    afiliadoId: string,
    ultimoPago: { fecha: Date; valor: number; metodo: string },
    metadata: MetadataCambio
  ): Promise<void> {
    await db.collection(AFILIADOS).doc(afiliadoId).update({
      ultimoPago: { ...ultimoPago, fecha: Timestamp.fromDate(ultimoPago.fecha) },
      estadoPlan: "activo",
      metadata: { ...metadata, fecha: Timestamp.fromDate(metadata.fecha) },
    });
  }
  async actualizar(id: string, cambios: Partial<Omit<Afiliado, "id">>): Promise<Afiliado> {
    const datos: any = { ...cambios };
    if (cambios.metadata) datos.metadata = { ...cambios.metadata, fecha: Timestamp.fromDate(cambios.metadata.fecha) };
    if (cambios.fechaAfiliacion) datos.fechaAfiliacion = Timestamp.fromDate(cambios.fechaAfiliacion);
    if (cambios.ultimoPago) datos.ultimoPago = { ...cambios.ultimoPago, fecha: Timestamp.fromDate(cambios.ultimoPago.fecha) };
    await db.collection(AFILIADOS).doc(id).update(datos);
    const doc = await db.collection(AFILIADOS).doc(id).get();
    return deFirestore(doc.id, doc.data()!);
  }
  async eliminar(id: string): Promise<void> {
    const batch = db.batch();
    batch.delete(db.collection(AFILIADOS).doc(id));

    const personas = await db.collection(PERSONAS_CUBIERTAS).where("afiliadoId", "==", id).get();
    personas.docs.forEach((d) => batch.delete(d.ref));

    await batch.commit();
  }
}
