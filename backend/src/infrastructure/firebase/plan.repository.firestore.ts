import { db, Timestamp } from "./admin";
import { PlanFunerario } from "../../domain/entities/plan-funerario";
import { PlanesRepository } from "../../application/ports/planes.repository";

const PLANES = "planes_funerarios";

export class PlanesRepositoryFirestore implements PlanesRepository {
  async crear(plan: Omit<PlanFunerario, "id">): Promise<PlanFunerario> {
    const ref = await db.collection(PLANES).add({
      ...plan,
      metadata: { ...plan.metadata, fecha: Timestamp.fromDate(plan.metadata.fecha) },
    });
    return { id: ref.id, ...plan };
  }

  async listar(): Promise<PlanFunerario[]> {
    const snap = await db.collection(PLANES).get();
    return snap.docs.map((d) => {
      const data = d.data();
      return { id: d.id, ...data, metadata: { ...data.metadata, fecha: data.metadata.fecha.toDate() } } as PlanFunerario;
    });
  }
}