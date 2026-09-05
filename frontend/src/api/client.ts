import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  connectAuthEmulator,
  User,
} from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, httpsCallable, connectFunctionsEmulator } from "firebase/functions";

// Detect local hosting/emulator environment early so we can override
// configuration values (projectId) that affect the functions URL.
const runningLocally =
  import.meta.env.DEV || location.hostname === "127.0.0.1" || location.hostname === "localhost";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  // When served from the local hosting emulator, the built app may still
  // contain production env vars. Force the emulator project id so functions
  // calls target the local emulator endpoints (see firebase-debug.log).
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? (runningLocally ? "trinitarios-dab7b" : ""),
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
/**
 * Firestore aquí es SOLO para lectura en tiempo real (que las tablas se
 * actualicen solas). Ninguna pantalla debe escribir directo con esto —
 * toda escritura pasa por las funciones de abajo. Así el backend siempre
 * puede confiar en metadata.modificadoPor (ver /firestore.rules).
 */
export const db = getFirestore(app);
const functions = getFunctions(app);

/**
 * Mientras desarrollas con `firebase emulators:start`, el cliente debe hablar
 * con los emuladores locales, NO con producción — de lo contrario terminas
 * llamando a una función que nunca se ha desplegado (el error de CORS que
 * viste es justo eso). Los puertos son configurables por si en tu máquina
 * Firebase termina asignando otros distintos a los de firebase.json
 * (revisa siempre la tabla que imprime la terminal al arrancar).
 */
// Connect to local emulators when developing or when the app is served
// from the hosting emulator (127.0.0.1 / localhost). The hosting emulator
// serves production-built assets where `import.meta.env.DEV` is false,


if (runningLocally) {
  const authPort = Number(import.meta.env.VITE_EMULATOR_AUTH_PORT ?? 9099);
  const firestorePort = Number(import.meta.env.VITE_EMULATOR_FIRESTORE_PORT ?? 3035);
  const functionsPort = Number(import.meta.env.VITE_EMULATOR_FUNCTIONS_PORT ?? 5001);
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

export function alCambiarSesion(cb: (user: User | null) => void) {
  return onAuthStateChanged(auth, cb);
}

// --- Llamadas al backend (admin-api) ---
// Cada módulo nuevo (servicios, convenios, reportes...) agrega sus propias
// funciones aquí, siguiendo el mismo patrón: una función de Cloud Functions
// por acción, envuelta con httpsCallable.

import type { CrearAfiliadoInput, PersonaCubierta, Afiliado } from "../types";

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
