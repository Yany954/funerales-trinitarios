import { db, Timestamp } from "./admin";
import { Convenio, TarifaConvenio } from "../../domain/entities/convenio";
import { ConveniosRepository } from "../../application/ports/convenios.repository";

const CONVENIOS = "convenios";
const TARIFAS = "tarifas";

export class ConveniosRepositoryFirestore implements ConveniosRepository {
  async crear(convenio: Omit<Convenio, "id">): Promise<Convenio> {
    const ref = await db.collection(CONVENIOS).add({
      ...convenio,
      metadata: { ...convenio.metadata, fecha: Timestamp.fromDate(convenio.metadata.fecha) },
    });
    return { id: ref.id, ...convenio };
  }

  async listar(): Promise<Convenio[]> {
    const snap = await db.collection(CONVENIOS).get();
    return snap.docs.map((d) => {
      const data = d.data();
      return { id: d.id, ...data, metadata: { ...data.metadata, fecha: data.metadata.fecha.toDate() } } as Convenio;
    });
  }

  async guardarTarifa(convenioId: string, tarifa: TarifaConvenio): Promise<void> {
    // El ID del documento ES el año -> guardarla de nuevo el mismo año actualiza en vez de duplicar.
    await db
      .collection(CONVENIOS)
      .doc(convenioId)
      .collection(TARIFAS)
      .doc(tarifa.anio)
      .set({
        ...tarifa,
        metadata: { ...tarifa.metadata, fecha: Timestamp.fromDate(tarifa.metadata.fecha) },
      });
  }
  async obtenerPorId(id: string): Promise<Convenio | null> {
  const doc = await db.collection(CONVENIOS).doc(id).get();
  if (!doc.exists) return null;
  const data = doc.data()!;
  return { id: doc.id, ...data, metadata: { ...data.metadata, fecha: data.metadata.fecha.toDate() } } as Convenio;
}
}