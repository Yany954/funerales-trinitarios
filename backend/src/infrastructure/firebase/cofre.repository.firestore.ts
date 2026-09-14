import { db, Timestamp } from "./admin";
import { TipoCofre } from "../../domain/entities/cofre";
import { CofresRepository } from "../../application/ports/cofres.repository";

const TIPOS_COFRE = "tipos_cofre";

export class CofresRepositoryFirestore implements CofresRepository {
  async crear(cofre: Omit<TipoCofre, "id">): Promise<TipoCofre> {
    const ref = await db.collection(TIPOS_COFRE).add({
      ...cofre,
      metadata: { ...cofre.metadata, fecha: Timestamp.fromDate(cofre.metadata.fecha) },
    });
    return { id: ref.id, ...cofre };
  }

  async listar(): Promise<TipoCofre[]> {
    const snap = await db.collection(TIPOS_COFRE).get();
    return snap.docs.map((d) => {
      const data = d.data();
      return { id: d.id, ...data, metadata: { ...data.metadata, fecha: data.metadata.fecha.toDate() } } as TipoCofre;
    });
  }
}