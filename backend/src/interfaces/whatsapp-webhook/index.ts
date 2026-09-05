/**
 * Placeholder para la fase 2 del proyecto (documento 01: Funcionalidades
 * Innovadoras) — el bot de WhatsApp Business + Twilio + ElevenLabs.
 *
 * Cuando se active, este webhook va a:
 *  1. Recibir el mensaje entrante de WhatsApp (vía Twilio o la API directa de Meta).
 *  2. Responder preguntas básicas (¿tengo plan?, horarios) usando los mismos
 *     casos de uso de application/ que ya usa el dashboard (ej. buscarPersonaCubierta).
 *  3. Escalar a un humano cuando el caso lo requiera, sin cambiar de número.
 *  4. Escribir en Firestore usando metadataIA(...) en vez de metadataHumano(...),
 *     para que quede registrado que fue la IA quien hizo el cambio.
 *
 * Por ahora no está implementado — el foco actual es el registro manual (Fase 1).
 */
export {};
