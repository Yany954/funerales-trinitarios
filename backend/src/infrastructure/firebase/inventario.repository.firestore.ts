import { db, Timestamp } from "./admin";
import { InventarioCofre } from "../../domain/entities/inventario-cofre";
import { InventarioRepository } from "../../application/ports/inventario.repository";
import { MetadataCambio } from "../../domain/value-objects/metadata-cambio";

const INVENTARIO = "inventario_cofres";

export class InventarioRepositoryFirestore implements InventarioRepository {
  async actualizarCantidad(sede: string, tipoCofreId: string, cantidad: number, metadata: MetadataCambio): Promise<InventarioCofre> {
    const id = `${sede}_${tipoCofreId}`;
    const registro: Omit<InventarioCofre, "id"> = { sede, tipoCofreId, cantidadDisponible: cantidad, metadata };
    await db.collection(INVENTARIO).doc(id).set({
      ...registro,
      metadata: { ...metadata, fecha: Timestamp.fromDate(metadata.fecha) },
    });
    return { id, ...registro };
  }

  async listarPorSede(sede: string): Promise<InventarioCofre[]> {
    const snap = await db.collection(INVENTARIO).where("sede", "==", sede).get();
    return snap.docs.map((d) => {
      const data = d.data();
      return { id: d.id, ...data, metadata: { ...data.metadata, fecha: data.metadata.fecha.toDate() } } as InventarioCofre;
    });
  }
}