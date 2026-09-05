import { db, Timestamp } from "./admin";
import { Afiliado, PersonaCubierta } from "../../domain/entities/afiliado";
import { AfiliadosRepository } from "../../application/ports/afiliados.repository";

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

    // Documento del titular — un ID predecible para poder actualizarlo sin duplicar.
    const titularRef = db.collection(PERSONAS_CUBIERTAS).doc(`titular_${afiliado.id}`);
    const titular: Omit<PersonaCubierta, "id"> = {
      nombreCompleto: afiliado.nombreCompleto,
      nombreBusqueda: afiliado.nombreCompleto.toLowerCase(),
      cedula: afiliado.cedula,
      esTitular: true,
      afiliadoId: afiliado.id,
    };
    batch.set(titularRef, titular);

    // Un documento por cada beneficiario.
    afiliado.beneficiarios.forEach((beneficiario, i) => {
      const ref = db.collection(PERSONAS_CUBIERTAS).doc(`beneficiario_${afiliado.id}_${i}`);
      const persona: Omit<PersonaCubierta, "id"> = {
        nombreCompleto: beneficiario.nombre,
        nombreBusqueda: beneficiario.nombre.toLowerCase(),
        cedula: beneficiario.cedula,
        esTitular: false,
        parentesco: beneficiario.parentesco,
        afiliadoId: afiliado.id,
      };
      batch.set(ref, persona);
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
}
