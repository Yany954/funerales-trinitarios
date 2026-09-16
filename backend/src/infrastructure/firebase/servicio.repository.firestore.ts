import { db, Timestamp } from "./admin";
import { Servicio } from "../../domain/entities/servicio";
import { ServiciosRepository } from "../../application/ports/servicios.repository";

const SERVICIOS = "servicios";

function aFirestore(servicio: Omit<Servicio, "id">) {
  return {
    ...servicio,
    fechaServicio: Timestamp.fromDate(servicio.fechaServicio),
    metadata: { ...servicio.metadata, fecha: Timestamp.fromDate(servicio.metadata.fecha) },
  };
}

function deFirestore(id: string, data: FirebaseFirestore.DocumentData): Servicio {
  return {
    id,
    ...data,
    fechaServicio: data.fechaServicio.toDate(),
    metadata: { ...data.metadata, fecha: data.metadata.fecha.toDate() },
  } as Servicio;
}

export class ServiciosRepositoryFirestore implements ServiciosRepository {
  async crear(servicio: Omit<Servicio, "id">): Promise<Servicio> {
    const ref = await db.collection(SERVICIOS).add(aFirestore(servicio));
    return { id: ref.id, ...servicio };
  }

  async listarPorSede(sede: string): Promise<Servicio[]> {
    const snap = await db.collection(SERVICIOS).where("sede", "==", sede).get();
    return snap.docs.map((d) => deFirestore(d.id, d.data()));
  }
  async buscarPorConvenio(convenioId: string, desde: Date, hasta: Date): Promise<Servicio[]> {
    const snap = await db.collection(SERVICIOS)
      .where("convenioId", "==", convenioId)
      .where("fechaServicio", ">=", Timestamp.fromDate(desde))
      .where("fechaServicio", "<=", Timestamp.fromDate(hasta))
      .get();
    return snap.docs.map((d) => deFirestore(d.id, d.data()));
  }

  async buscarPorSedeYConvenios(sede: string, convenioIds: string[], desde: Date, hasta: Date): Promise<Servicio[]> {
    if (convenioIds.length === 0) return [];
    const snap = await db.collection(SERVICIOS)
      .where("sede", "==", sede)
      .where("convenioId", "in", convenioIds.slice(0, 10)) // límite de Firestore para "in"
      .where("fechaServicio", ">=", Timestamp.fromDate(desde))
      .where("fechaServicio", "<=", Timestamp.fromDate(hasta))
      .get();
    return snap.docs.map((d) => deFirestore(d.id, d.data()));
  }

  async buscarPorSede(sede: string, desde: Date, hasta: Date): Promise<Servicio[]> {
    const snap = await db.collection(SERVICIOS)
      .where("sede", "==", sede)
      .where("fechaServicio", ">=", Timestamp.fromDate(desde))
      .where("fechaServicio", "<=", Timestamp.fromDate(hasta))
      .get();
    return snap.docs.map((d) => deFirestore(d.id, d.data()));
  }
  async obtenerPorId(id: string): Promise<Servicio | null> {
  const doc = await db.collection(SERVICIOS).doc(id).get();
  if (!doc.exists) return null;
  return deFirestore(doc.id, doc.data()!);
}

async actualizar(id: string, cambios: Partial<Omit<Servicio, "id">>): Promise<Servicio> {
  const datos: any = { ...cambios };
  if (cambios.fechaServicio) datos.fechaServicio = Timestamp.fromDate(cambios.fechaServicio);
  if (cambios.metadata) datos.metadata = { ...cambios.metadata, fecha: Timestamp.fromDate(cambios.metadata.fecha) };
  await db.collection(SERVICIOS).doc(id).update(datos);
  return (await this.obtenerPorId(id))!;
}

}
