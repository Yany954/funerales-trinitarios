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
}