/**
 * Quién hizo el último cambio a un documento, y por dónde entró.
 *
 * IMPORTANTE: este objeto SIEMPRE lo construye el backend (ver los archivos
 * "usecase" dentro de application/), nunca el cliente. Si el frontend o el bot
 * pudieran mandar este campo directamente, cualquiera podría mentir sobre
 * quién hizo el cambio — por eso las reglas de Firestore bloquean toda
 * escritura que no venga del Admin SDK (ver /firestore.rules).
 */

export type CanalCambio = "dashboard-web" | "whatsapp-bot" | "agente-voz";
export type TipoAutor = "humano" | "ia";

export interface MetadataCambio {
  tipo: TipoAutor;
  canal: CanalCambio;
  /** UID de Firebase Auth si es humano, o un identificador fijo del agente si es IA (ej. "bot-whatsapp-v1"). */
  identificador: string;
  fecha: Date;
}

/** Construye la metadata para un cambio hecho por un miembro del staff desde el dashboard. */
export function metadataHumano(uid: string): MetadataCambio {
  return { tipo: "humano", canal: "dashboard-web", identificador: uid, fecha: new Date() };
}

/** Construye la metadata para un cambio hecho automáticamente por un agente de IA. */
export function metadataIA(canal: Exclude<CanalCambio, "dashboard-web">, identificadorAgente: string): MetadataCambio {
  return { tipo: "ia", canal, identificador: identificadorAgente, fecha: new Date() };
}
