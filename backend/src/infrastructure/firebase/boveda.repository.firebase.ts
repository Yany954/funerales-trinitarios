import { db, Timestamp } from "./admin";
import { Boveda, EstadoBoveda } from "../../domain/entities/boveda";
import { BovedaRepository } from "../../application/ports/boveda.repository";
import { MetadataCambio } from "../../domain/value-objects/metadata-cambio";

const BOVEDAS = "bovedas";

function calcularFechaLimite(fechaInicio: Date): Date {
  const fechaLimite = new Date(fechaInicio);
  fechaLimite.setFullYear(fechaLimite.getFullYear() + 4);
  return fechaLimite;
}
function aFirestore(boveda: Omit<Boveda, "id">) {
  return {
    ...boveda,
    fechaInicio: Timestamp.fromDate(boveda.fechaInicio),
    fechaLimite: Timestamp.fromDate(boveda.fechaLimite),
    metadata: {
      ...boveda.metadata,
      fecha: Timestamp.fromDate(boveda.metadata.fecha),
    },
  };
}
function deFirestore(id: string, data: FirebaseFirestore.DocumentData): Boveda {
  return {
    id,
    ...data,
    fechaInicio: data.fechaInicio.toDate(),
    fechaLimite: data.fechaLimite.toDate(),
    metadata: { ...data.metadata, fecha: data.metadata.fecha.toDate() },
  } as Boveda;
}
export class BovedaRepositoryFirestore implements BovedaRepository {
  async crear(
    servicioId: string,
    zona: string,
    fechaInicio: Date,
    valorArriendo: number,
    incluyeExhumacion: boolean,
    metadata: MetadataCambio
  ): Promise<Boveda> {
    const fechaLimite = calcularFechaLimite(fechaInicio);
    const estado: EstadoBoveda = "vigente";
    const bovedaData: Omit<Boveda, "id"> = {
      servicioId,
      zona,
      fechaInicio,
      fechaLimite,
      valorArriendo,
      incluyeExhumacion,
      metadata,
      estado,
    };
    const ref = await db.collection(BOVEDAS).add(aFirestore(bovedaData));
    return { id: ref.id, ...bovedaData };
  }

    async listarEstado(estado: EstadoBoveda): Promise<Boveda[]> {
      const snapshot = await db.collection(BOVEDAS).where("estado", "==", estado).get();
      return snapshot.docs.map((d) => deFirestore(d.id, d.data()));
    }

    async actualizar(boveda: Boveda): Promise<void> {
      const ref = db.collection(BOVEDAS).doc(boveda.id);
      const {id, ...data} = boveda;
      await ref.update(aFirestore(data));
    }

    async eliminar(id: string): Promise<void> {
      const ref = db.collection(BOVEDAS).doc(id);
      await ref.delete();
    }

    async actualizarEstado(
      bovedaId: string,
      nuevoEstado: EstadoBoveda,
      metadata: MetadataCambio
    ): Promise<void> {
      const ref = db.collection(BOVEDAS).doc(bovedaId);
      await ref.update({
        estado: nuevoEstado,
        metadata: { ...metadata, fecha: Timestamp.fromDate(metadata.fecha) },
      });
    }
}