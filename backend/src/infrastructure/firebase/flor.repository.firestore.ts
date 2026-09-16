import { db, Timestamp } from "./admin";
import { Flor } from "../../domain/entities/flor";
import { FloresRepository } from "../../application/ports/flores.repository";

const FLORES = "flores";

export class FloresRepositoryFirestore implements FloresRepository {
  async crear(flor: Omit<Flor, "id">): Promise<Flor> {
    const ref = await db.collection(FLORES).add({
      ...flor,
      metadata: { ...flor.metadata, fecha: Timestamp.fromDate(flor.metadata.fecha) },
    });
    return { id: ref.id, ...flor };
  }
  async listar(): Promise<Flor[]> {
    const snap = await db.collection(FLORES).get();
    return snap.docs.map((d) => {
      const data = d.data();
      return { id: d.id, ...data, metadata: { ...data.metadata, fecha: data.metadata.fecha.toDate() } } as Flor;
    });
  }
  async actualizar(id: string, cambios: Partial<Omit<Flor, "id">>): Promise<Flor> {
    const datos: any = { ...cambios };
    if (cambios.metadata) datos.metadata = { ...cambios.metadata, fecha: Timestamp.fromDate(cambios.metadata.fecha) };
    await db.collection(FLORES).doc(id).update(datos);
    const doc = await db.collection(FLORES).doc(id).get();
    const data = doc.data()!;
    return { id, ...data, metadata: { ...data.metadata, fecha: data.metadata.fecha.toDate() } } as Flor;
  }

  async eliminar(id: string): Promise<void> {
    await db.collection(FLORES).doc(id).delete();
  }
}