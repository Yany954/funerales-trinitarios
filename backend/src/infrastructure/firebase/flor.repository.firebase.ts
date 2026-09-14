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
}