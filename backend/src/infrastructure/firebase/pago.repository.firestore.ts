import { db, Timestamp } from "./admin";
import { Pago } from "../../domain/entities/pago";
import { PagosRepository } from "../../application/ports/pagos.repository";

const PAGOS = "pagos";

function deFirestore(id: string, data: FirebaseFirestore.DocumentData): Pago {
  return {
    id,
    ...data,
    fecha: data.fecha.toDate(),
    metadata: { ...data.metadata, fecha: data.metadata.fecha.toDate() },
  } as Pago;
}

export class PagosRepositoryFirestore implements PagosRepository {
  async crear(pago: Omit<Pago, "id">): Promise<Pago> {
    const ref = await db.collection(PAGOS).add({
      ...pago,
      fecha: Timestamp.fromDate(pago.fecha),
      metadata: { ...pago.metadata, fecha: Timestamp.fromDate(pago.metadata.fecha) },
    });
    return { id: ref.id, ...pago };
  }

  async listarPorAfiliado(afiliadoId: string): Promise<Pago[]> {
    const snap = await db.collection(PAGOS).where("afiliadoId", "==", afiliadoId).orderBy("fecha", "desc").get();
    return snap.docs.map((d) => deFirestore(d.id, d.data()));
  }
}