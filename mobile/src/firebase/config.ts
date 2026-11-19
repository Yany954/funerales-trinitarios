import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence, connectAuthEmulator, type Auth } from "firebase/auth";
import { initializeFirestore, getFirestore, connectFirestoreEmulator, type Firestore } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { getStorage, connectStorageEmulator } from "firebase/storage";

/**
 * Conexión al MISMO proyecto de Firebase que usa el dashboard.
 * La app solo LEE de Firestore (onSnapshot); toda escritura va por Cloud Functions.
 */
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const yaIniciada = getApps().length > 0;
const app = yaIniciada ? getApp() : initializeApp(firebaseConfig);

// La sesión se guarda en el celular: el afiliado no tiene que poner el PIN cada vez.
// (Con recarga rápida en desarrollo el módulo se vuelve a evaluar: se reutiliza la instancia.)
let authInstancia: Auth;
try {
  authInstancia = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
} catch {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  authInstancia = require("firebase/auth").getAuth(app);
}
export const auth = authInstancia;

// Algunas redes móviles cortan la conexión en tiempo real: cambia sola a long polling.
// En desarrollo, la recarga rápida vuelve a evaluar este archivo: se guarda la
// instancia en globalThis para no crear una segunda (daría "Expected first
// argument to doc() to be a CollectionReference…").
const global_ = globalThis as unknown as { __trinitariosDb?: Firestore };
export const db: Firestore = global_.__trinitariosDb ?? (global_.__trinitariosDb = yaIniciada ? getFirestore(app) : initializeFirestore(app, { experimentalAutoDetectLongPolling: true }));
export const functions = getFunctions(app);
export const storage = getStorage(app);

const usarEmuladores = __DEV__ && process.env.EXPO_PUBLIC_USAR_EMULADORES === "true";
if (usarEmuladores && !yaIniciada) {
  // El emulador de Android ve la Mac en 10.0.2.2; un celular físico necesita la IP de la Mac.
  const host = process.env.EXPO_PUBLIC_EMULADOR_HOST || (Platform.OS === "android" ? "10.0.2.2" : "127.0.0.1");
  connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(db, host, 3035);
  connectFunctionsEmulator(functions, host, 5001);
  connectStorageEmulator(storage, host, 9199);
  console.log(`Usando emuladores de Firebase en ${host}`);
}
