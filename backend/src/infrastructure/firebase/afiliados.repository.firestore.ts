import { db, Timestamp } from "./admin";
import { Afiliado, Beneficiario, PersonaCubierta } from "../../domain/entities/afiliado";
import { AfiliadosRepository } from "../../application/ports/afiliados.repository";
import { MetadataCambio } from "../../domain/value-objects/metadata-cambio";
import { estaRetirado } from "../../domain/value-objects/estado-beneficiario";

const AFILIADOS = "afiliados";
const PERSONAS_CUBIERTAS = "personas_cubiertas";

function palabrasDeNombre(nombre: string): string[] {
  return nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/\s+/)
    .filter(Boolean);
}

/** Convierte fechas JS <-> Timestamp de Firestore al escribir. */
function aFirestore(afiliado: Omit<Afiliado, "id">) {
  return {
    ...afiliado,
    fechaAfiliacion: Timestamp.fromDate(afiliado.fechaAfiliacion),
    fechaAfiliacionReal: Timestamp.fromDate(afiliado.fechaAfiliacionReal),
    fechaNacimiento: Timestamp.fromDate(afiliado.fechaNacimiento),
    beneficiarios: afiliado.beneficiarios.map((b) => ({
      ...b,
      fechaNacimiento: b.fechaNacimiento ? Timestamp.fromDate(b.fechaNacimiento) : undefined,
      fechaAdicion: Timestamp.fromDate(b.fechaAdicion),
    })),
    ultimoPago: afiliado.ultimoPago
      ? { ...afiliado.ultimoPago, fecha: Timestamp.fromDate(afiliado.ultimoPago.fecha) }
      : null,
    metadata: { ...afiliado.metadata, fecha: Timestamp.fromDate(afiliado.metadata.fecha) },
  };
}

function convertirBeneficiario(b: any): Beneficiario {
  const aFecha = (v: any) => (v?.toDate ? v.toDate() : v);
  return {
    ...b,
    fechaNacimiento: aFecha(b.fechaNacimiento),
    fechaAdicion: aFecha(b.fechaAdicion),
    fechaFallecimiento: aFecha(b.fechaFallecimiento),
    novedades: b.novedades?.map((n: any) => ({ ...n, fecha: aFecha(n.fecha) })),
  };
}

/** Convierte Timestamp <-> fechas JS al leer. */
function deFirestore(id: string, data: FirebaseFirestore.DocumentData): Afiliado {
  return {
    id,
    ...data,
    fechaAfiliacion: data.fechaAfiliacion.toDate(),
    fechaAfiliacionReal: data.fechaAfiliacionReal?.toDate ? data.fechaAfiliacionReal.toDate() : data.fechaAfiliacionReal,
    fechaNacimiento: data.fechaNacimiento?.toDate ? data.fechaNacimiento.toDate() : data.fechaNacimiento,
    ultimoPago: data.ultimoPago ? { ...data.ultimoPago, fecha: data.ultimoPago.fecha.toDate() } : null,
    beneficiarios: (data.beneficiarios ?? []).map(convertirBeneficiario),
    metadata: { ...data.metadata, fecha: data.metadata.fecha.toDate() },
  } as Afiliado;
}

export class AfiliadosRepositoryFirestore implements AfiliadosRepository {
  async crear(afiliado: Omit<Afiliado, "id">): Promise<Afiliado> {
    const ref = await db.collection(AFILIADOS).add(aFirestore(afiliado));
    return { id: ref.id, ...afiliado };
  }

  async obtenerPorId(id: string): Promise<Afiliado | null> {
    const doc = await db.collection(AFILIADOS).doc(id).get();
    if (!doc.exists) return null;
    return deFirestore(doc.id, doc.data()!);
  }

  async listarTodos(): Promise<Afiliado[]> {
    const snap = await db.collection(AFILIADOS).get();
    return snap.docs.map((d) => deFirestore(d.id, d.data()));
  }

  async actualizarEstadoPlan(id: string, estado: Afiliado["estadoPlan"], metadata: MetadataCambio): Promise<void> {
    await db.collection(AFILIADOS).doc(id).update({
      estadoPlan: estado,
      metadata: { ...metadata, fecha: Timestamp.fromDate(metadata.fecha) },
    });
  }

  /**
   * Ya no se usa directamente (fue reemplazado por recalcularAfiliadoDesdePagos,
   * que calcula ultimoPago/periodoCubiertoHasta/estadoPlan juntos a partir del
   * historial de pagos). Se conserva por si algo externo sigue implementando
   * la interfaz AfiliadosRepository y la requiere.
   */
  async actualizarUltimoPago(
    afiliadoId: string,
    ultimoPago: { fecha: Date; valor: number; metodo: string },
    metadata: MetadataCambio
  ): Promise<void> {
    await db.collection(AFILIADOS).doc(afiliadoId).update({
      ultimoPago: { ...ultimoPago, fecha: Timestamp.fromDate(ultimoPago.fecha) },
      estadoPlan: "activo",
      metadata: { ...metadata, fecha: Timestamp.fromDate(metadata.fecha) },
    });
  }

  async actualizar(id: string, cambios: Partial<Omit<Afiliado, "id">>): Promise<Afiliado> {
    const datos: any = { ...cambios };
    if (cambios.metadata) datos.metadata = { ...cambios.metadata, fecha: Timestamp.fromDate(cambios.metadata.fecha) };
    if (cambios.fechaAfiliacion) datos.fechaAfiliacion = Timestamp.fromDate(cambios.fechaAfiliacion);
    if (cambios.fechaAfiliacionReal) datos.fechaAfiliacionReal = Timestamp.fromDate(cambios.fechaAfiliacionReal);
    if (cambios.fechaNacimiento) datos.fechaNacimiento = Timestamp.fromDate(cambios.fechaNacimiento);
    if (cambios.ultimoPago) datos.ultimoPago = { ...cambios.ultimoPago, fecha: Timestamp.fromDate(cambios.ultimoPago.fecha) };
    await db.collection(AFILIADOS).doc(id).update(datos);
    const doc = await db.collection(AFILIADOS).doc(id).get();
    return deFirestore(doc.id, doc.data()!);
  }

  async eliminar(id: string): Promise<void> {
    const batch = db.batch();
    batch.delete(db.collection(AFILIADOS).doc(id));

    const personas = await db.collection(PERSONAS_CUBIERTAS).where("afiliadoId", "==", id).get();
    personas.docs.forEach((d) => batch.delete(d.ref));

    await batch.commit();
  }

  async sincronizarPersonasCubiertas(afiliado: Afiliado): Promise<void> {
    const batch = db.batch();

    const titularRef = db.collection(PERSONAS_CUBIERTAS).doc(`titular_${afiliado.id}`);
    const titular: Omit<PersonaCubierta, "id"> = {
      nombreCompleto: afiliado.nombreCompleto,
      nombreBusqueda: afiliado.nombreCompleto.toLowerCase(),
      palabrasNombre: palabrasDeNombre(afiliado.nombreCompleto),
      cedula: afiliado.cedula,
      esTitular: true,
      afiliadoId: afiliado.id,
    };
    batch.set(titularRef, titular);

    // Borra los beneficiarios anteriores antes de recrear — así, si editaste
    // y quitaste alguno, no queda un registro huérfano todavía buscable.
    const existentes = await db.collection(PERSONAS_CUBIERTAS)
      .where("afiliadoId", "==", afiliado.id)
      .where("esTitular", "==", false)
      .get();
    existentes.docs.forEach((d) => batch.delete(d.ref));

    afiliado.beneficiarios.forEach((beneficiario, i) => {
      if (estaRetirado(beneficiario)) return; // retirado: sigue guardado, pero no figura como cubierto

      const ref = db.collection(PERSONAS_CUBIERTAS).doc(`beneficiario_${afiliado.id}_${i}`);
      const persona: Omit<PersonaCubierta, "id"> = {
        nombreCompleto: beneficiario.nombre,
        nombreBusqueda: beneficiario.nombre.toLowerCase(),
        palabrasNombre: palabrasDeNombre(beneficiario.nombre),
        cedula: beneficiario.cedula,
        esTitular: false,
        parentesco: beneficiario.parentesco,
        afiliadoId: afiliado.id,
      };
      batch.set(ref, persona);
    });

    await batch.commit();
  }

  async buscarPersonaCubiertaPorNombreOCedula(termino: string): Promise<PersonaCubierta[]> {
    // Búsqueda por cédula: coincidencia exacta.
    const porCedula = await db.collection(PERSONAS_CUBIERTAS).where("cedula", "==", termino).get();
    if (!porCedula.empty) {
      return porCedula.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PersonaCubierta, "id">) }));
    }

    // Búsqueda por nombre: cada palabra escrita (nombre, apellido, o varias a
    // la vez) contra las palabras indexadas, sin importar mayúsculas/tildes.
    const palabras = termino
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 10); // límite de Firestore para array-contains-any

    if (palabras.length === 0) return [];

    const snap = await db.collection(PERSONAS_CUBIERTAS).where("palabrasNombre", "array-contains-any", palabras).get();

    // Si escribieron varias palabras, exige que el nombre las contenga TODAS,
    // no solo una cualquiera.
    return snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<PersonaCubierta, "id">) }))
      .filter((p) => palabras.every((palabra) => p.palabrasNombre?.includes(palabra)));
  }
}