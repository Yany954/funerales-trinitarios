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
  async actualizar(id: string, cambios: Partial<Omit<PlanFunerario, "id">>): Promise<PlanFunerario> {
  const datos: any = { ...cambios };
  if (cambios.metadata) datos.metadata = { ...cambios.metadata, fecha: Timestamp.fromDate(cambios.metadata.fecha) };
  await db.collection(PLANES).doc(id).update(datos);
  const doc = await db.collection(PLANES).doc(id).get();
  const data = doc.data()!;
  return { id, ...data, metadata: { ...data.metadata, fecha: data.metadata.fecha.toDate() } } as PlanFunerario;
}

async guardarPrecioAnio(planId: string, anio: string, valorMensual: number, metadata: any): Promise<void> {
  // El ID del documento en historial ES el año, igual que las tarifas de
  // convenios — guardar de nuevo el mismo año actualiza en vez de duplicar.
  await db.collection(PLANES).doc(planId).collection("historial").doc(anio).set({
    anio,
    valorMensual,
    metadata: { ...metadata, fecha: Timestamp.fromDate(metadata.fecha) },
  });
  // El valorMensual "vigente" del plan (el que usa el selector de Afiliados)
  // se actualiza también, para que siempre refleje el precio más reciente.
  await db.collection(PLANES).doc(planId).update({ valorMensual });
}
}