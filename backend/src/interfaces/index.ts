/**
 * Punto de entrada único de Cloud Functions. Firebase busca aquí (ver
 * package.json -> "main": "lib/interfaces/index.js") todas las funciones
 * que se van a desplegar.
 *
 * Al agregar un módulo nuevo (servicios, convenios, reportes...), créalo
 * siguiendo el patrón de admin-api/afiliados.ts y expórtalo aquí.
 */

export { crearAfiliadoFn, buscarPersonaCubiertaFn } from "./admin-api/afiliados";

export { actualizarEstadosBovedasFn } from "./scheduled/actualizar-estados-bovedas";
export { registrarBovedaFn, listarBovedasPorEstadoFn } from "./admin-api/bovedas";
// TODO — siguientes módulos, mismo patrón que afiliados:
// export { crearServicioFn, generarReporteFn } from "./admin-api/servicios";
// export { crearConvenioFn, actualizarTarifaFn } from "./admin-api/convenios";
