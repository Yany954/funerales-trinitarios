import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  connectAuthEmulator,
  sendPasswordResetEmail,
  User,
} from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, httpsCallable, connectFunctionsEmulator } from "firebase/functions";

import type { CrearAfiliadoInput, PersonaCubierta, Afiliado } from "../types";
import type { RegistrarBovedaInput, Boveda, EstadoBoveda } from "../types";
import type { RegistrarServicioInput, Servicio } from "../types";
import type { CrearConvenioInput, GuardarTarifaInput, Convenio } from "../types";
import type { CrearTipoCofreInput, TipoCofre } from "../types";
import type { CrearPlanInput, PlanFunerario } from "../types";
import type { CrearFlorInput, Flor } from "../types";
import type { ActualizarInventarioInput, InventarioCofre } from "../types";
import type { GenerarReporteInput, FilaReporte } from "../types";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import type { ActualizarTipoCofreInput } from "../types";
import type { ActualizarServicioInput } from "../types";
import type { RegistrarPagoInput, Pago } from "../types";
import type { UsuarioListado, CrearUsuarioInput } from "../types";
import type { ActualizarFlorInput } from "../types";
import type { CambiarEstadoFacturacionInput } from "../types";



const runningLocally =
  import.meta.env.DEV || location.hostname === "127.0.0.1" || location.hostname === "localhost";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? (runningLocally ? "trinitarios-dab7b" : ""),
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
const functions = getFunctions(app);
export const storage = getStorage(app);


if (runningLocally) {
  const authPort = Number(import.meta.env.VITE_EMULATOR_AUTH_PORT ?? 9099);
  const firestorePort = Number(import.meta.env.VITE_EMULATOR_FIRESTORE_PORT ?? 3035);
  const functionsPort = Number(import.meta.env.VITE_EMULATOR_FUNCTIONS_PORT ?? 5001);
  const storagePort = Number(import.meta.env.VITE_EMULATOR_STORAGE_PORT ?? 9199);
  connectStorageEmulator(storage, "127.0.0.1", storagePort);
  console.log(`Conectando a emuladores locales: auth:${authPort}, firestore:${firestorePort}, functions:${functionsPort}`
  );

  connectAuthEmulator(auth, `http://127.0.0.1:${authPort}`, { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", firestorePort);
  connectFunctionsEmulator(functions, "127.0.0.1", functionsPort);
}


export function iniciarSesion(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function cerrarSesion() {
  return signOut(auth);
}
export function recuperarContrasena(email: string) {
  return sendPasswordResetEmail(auth, email);
}


export function alCambiarSesion(cb: (user: User | null) => void) {
  return onAuthStateChanged(auth, cb);
}

export async function crearAfiliado(input: CrearAfiliadoInput): Promise<Afiliado> {
  const fn = httpsCallable<CrearAfiliadoInput, { afiliado: Afiliado }>(functions, "crearAfiliadoFn");
  const res = await fn(input);
  return res.data.afiliado;
}

export async function buscarPersonaCubierta(termino: string): Promise<PersonaCubierta[]> {
  const fn = httpsCallable<{ termino: string }, { resultados: PersonaCubierta[] }>(
    functions,
    "buscarPersonaCubiertaFn"
  );
  const res = await fn({ termino });
  return res.data.resultados;
}


export async function registrarBoveda(input: RegistrarBovedaInput): Promise<Boveda> {
  const fn = httpsCallable<RegistrarBovedaInput, { boveda: Boveda }>(functions, "registrarBovedaFn");
  const res = await fn(input);
  return res.data.boveda;
}

export async function listarBovedasPorEstado(estado?: EstadoBoveda): Promise<Boveda[]> {
  const fn = httpsCallable<{ estado?: EstadoBoveda }, { bovedas: Boveda[] }>(functions, "listarBovedasPorEstadoFn");
  const res = await fn({ estado });
  return res.data.bovedas;
}

export async function registrarServicio(input: RegistrarServicioInput): Promise<Servicio> {
  const fn = httpsCallable<RegistrarServicioInput, { servicio: Servicio }>(functions, "registrarServicioFn");
  const res = await fn(input);
  return res.data.servicio;
}

export async function crearConvenio(input: CrearConvenioInput): Promise<Convenio> {
  const fn = httpsCallable<CrearConvenioInput, { convenio: Convenio }>(functions, "crearConvenioFn");
  const res = await fn(input);
  return res.data.convenio;
}

export async function guardarTarifa(input: GuardarTarifaInput): Promise<void> {
  const fn = httpsCallable<GuardarTarifaInput, { ok: boolean }>(functions, "guardarTarifaFn");
  await fn(input);
}

export async function crearTipoCofre(input: CrearTipoCofreInput): Promise<TipoCofre> {
  const fn = httpsCallable<CrearTipoCofreInput, { cofre: TipoCofre }>(functions, "crearTipoCofreFn");
  const res = await fn(input);
  return res.data.cofre;
}

export async function crearPlan(input: CrearPlanInput): Promise<PlanFunerario> {
  const fn = httpsCallable<CrearPlanInput, { plan: PlanFunerario }>(functions, "crearPlanFn");
  const res = await fn(input);
  return res.data.plan;
}

export async function crearFlor(input: CrearFlorInput): Promise<Flor> {
  const fn = httpsCallable<CrearFlorInput, { flor: Flor }>(functions, "crearFlorFn");
  const res = await fn(input);
  return res.data.flor;
}

export async function actualizarInventario(input: ActualizarInventarioInput): Promise<InventarioCofre> {
  const fn = httpsCallable<ActualizarInventarioInput, { registro: InventarioCofre }>(functions, "actualizarInventarioFn");
  const res = await fn(input);
  return res.data.registro;
}

export async function generarReporte(input: GenerarReporteInput): Promise<FilaReporte[]> {
  const fn = httpsCallable<GenerarReporteInput, { filas: FilaReporte[] }>(functions, "generarReporteFn");
  const res = await fn(input);
  return res.data.filas;
}
export async function actualizarTipoCofre(input: ActualizarTipoCofreInput): Promise<TipoCofre> {
  const fn = httpsCallable<ActualizarTipoCofreInput, { cofre: TipoCofre }>(functions, "actualizarTipoCofreFn");
  const res = await fn(input);
  return res.data.cofre;
}
export async function actualizarServicio(input: ActualizarServicioInput): Promise<Servicio> {
  const fn = httpsCallable<ActualizarServicioInput, { servicio: Servicio }>(functions, "actualizarServicioFn");
  const res = await fn(input);
  return res.data.servicio;
}

export async function registrarPago(input: RegistrarPagoInput): Promise<Pago> {
  const fn = httpsCallable<RegistrarPagoInput, { pago: Pago }>(functions, "registrarPagoFn");
  const res = await fn(input);
  return res.data.pago;
}

export async function listarPagosPorAfiliado(afiliadoId: string): Promise<Pago[]> {
  const fn = httpsCallable<{ afiliadoId: string }, { pagos: Pago[] }>(functions, "listarPagosPorAfiliadoFn");
  const res = await fn({ afiliadoId });
  return res.data.pagos;
}

export async function crearUsuario(input: CrearUsuarioInput): Promise<{ uid: string; enlaceInvitacion: string }> {
  const fn = httpsCallable<CrearUsuarioInput, { uid: string; enlaceInvitacion: string }>(functions, "crearUsuarioFn");
  const res = await fn(input);
  return res.data;
}

export async function listarUsuarios(): Promise<UsuarioListado[]> {
  const fn = httpsCallable<void, { usuarios: UsuarioListado[] }>(functions, "listarUsuariosFn");
  const res = await fn();
  return res.data.usuarios;
}

export async function asignarRol(uid: string, rol: "admin" | "empleado", sede: string): Promise<void> {
  const fn = httpsCallable<{ uid: string; claims: { rol: string; sede: string } }, { ok: boolean }>(functions, "asignarRolFn");
  await fn({ uid, claims: { rol, sede: rol === "admin" ? "all" : sede } });
}

export async function generarEnlaceInvitacion(email: string): Promise<string> {
  const fn = httpsCallable<{ email: string }, { enlaceInvitacion: string }>(functions, "generarEnlaceInvitacionFn");
  const res = await fn({ email });
  return res.data.enlaceInvitacion;
}

export async function cambiarEstadoUsuario(uid: string, deshabilitado: boolean): Promise<void> {
  const fn = httpsCallable<{ uid: string; deshabilitado: boolean }, { ok: boolean }>(functions, "cambiarEstadoUsuarioFn");
  await fn({ uid, deshabilitado });
}

export async function actualizarFlor(input: ActualizarFlorInput): Promise<Flor> {
  const fn = httpsCallable<ActualizarFlorInput, { flor: Flor }>(functions, "actualizarFlorFn");
  const res = await fn(input);
  return res.data.flor;
}

export async function eliminarFlor(id: string): Promise<void> {
  const fn = httpsCallable<{ id: string }, { ok: boolean }>(functions, "eliminarFlorFn");
  await fn({ id });
}

export async function eliminarTipoCofre(id: string): Promise<void> {
  const fn = httpsCallable<{ id: string }, { ok: boolean }>(functions, "eliminarTipoCofreFn");
  await fn({ id });
}
export async function actualizarEstadoFacturacion(id: string, estado: Servicio["estadoFacturacion"]): Promise<Servicio> {
  const fn = httpsCallable<{ id: string; estado: Servicio["estadoFacturacion"] }, { servicio: Servicio }>(functions, "actualizarEstadoFacturacionFn");
  const res = await fn({ id, estado });
  return res.data.servicio;
}
export async function cambiarEstadoFacturacion(input: CambiarEstadoFacturacionInput): Promise<Servicio> {
  const fn = httpsCallable<CambiarEstadoFacturacionInput, { servicio: Servicio }>(functions, "cambiarEstadoFacturacionFn");
  const res = await fn(input);
  return res.data.servicio;
}