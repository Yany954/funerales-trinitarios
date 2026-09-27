import { db, Timestamp } from "./admin";
import { ItemBoveda } from "../../domain/entities/item-boveda";
import { ItemBovedaRepository } from "../../application/ports/item-boveda.repository";

const ITEMS_BOVEDA = "items_boveda";

function deFirestore(id: string, data: FirebaseFirestore.DocumentData): ItemBoveda {
  return { id, ...data, metadata: { ...data.metadata, fecha: data.metadata.fecha.toDate() } } as ItemBoveda;
}

export class ItemBovedaRepositoryFirestore implements ItemBovedaRepository {
  async crear(item: Omit<ItemBoveda, "id">): Promise<ItemBoveda> {
    const ref = await db.collection(ITEMS_BOVEDA).add({
      ...item,
      metadata: { ...item.metadata, fecha: Timestamp.fromDate(item.metadata.fecha) },
    });
    return { id: ref.id, ...item };
  }

  async listar(): Promise<ItemBoveda[]> {
    const snap = await db.collection(ITEMS_BOVEDA).get();
    return snap.docs.map((d) => deFirestore(d.id, d.data()));
  }

  async obtenerPorId(id: string): Promise<ItemBoveda | null> {
    const doc = await db.collection(ITEMS_BOVEDA).doc(id).get();
    return doc.exists ? deFirestore(doc.id, doc.data()!) : null;
  }

  async actualizar(id: string, cambios: Partial<Omit<ItemBoveda, "id">>): Promise<ItemBoveda> {
    const datos: any = { ...cambios };
    if (cambios.metadata) datos.metadata = { ...cambios.metadata, fecha: Timestamp.fromDate(cambios.metadata.fecha) };
    await db.collection(ITEMS_BOVEDA).doc(id).update(datos);
    return (await this.obtenerPorId(id))!;
  }

  async eliminar(id: string): Promise<void> {
    await db.collection(ITEMS_BOVEDA).doc(id).delete();
  }
}