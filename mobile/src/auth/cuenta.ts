import { httpsCallable } from "firebase/functions";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { auth, functions } from "@/firebase/config";
import i18n from "@/i18n";

/**
 * Login de afiliados: cédula + PIN.
 * Firebase Auth necesita un correo, así que la cédula se convierte en un correo
 * interno (no existe de verdad). DEBE coincidir con el backend:
 * backend/src/domain/value-objects/cuenta-app.ts → correoInternoAfiliado.
 */
const DOMINIO_CORREO_AFILIADO = "afiliados.trinitarios.app";
export const LARGO_PIN = 6;

/** Deja solo letras y números: "1.234.567" = "1234567". Igual que el backend. */
export function normalizarCedula(cedula: string): string {
  return cedula.replace(/[^0-9a-zA-Z]/g, "").toUpperCase();
}

function correoInterno(cedula: string): string {
  return `${normalizarCedula(cedula).toLowerCase()}@${DOMINIO_CORREO_AFILIADO}`;
}

/** Traduce los errores de Firebase a un mensaje entendible para el afiliado. */
export function mensajeDeError(err: unknown): string {
  const t = i18n.t.bind(i18n);
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
      case "auth/invalid-email":
        return t("errores.credencialesInvalidas");
      case "auth/too-many-requests":
        return t("errores.demasiadosIntentos");
      case "auth/network-request-failed":
      case "functions/unavailable":
        return t("errores.sinConexion");
      case "functions/failed-precondition":
        // Mensajes que el backend escribió para mostrarse tal cual (en español).
        // El SDK les agrega el código HTTP al final (" [400]"): se quita.
        return err.message.replace(/\s*\[\d{3}\]$/, "");
    }
  }
  return t("errores.generico");
}

export async function iniciarSesion(cedula: string, pin: string): Promise<void> {
  await signInWithEmailAndPassword(auth, correoInterno(cedula), pin);
}

export function cerrarSesion(): Promise<void> {
  return signOut(auth);
}

export interface DatosRegistro {
  cedula: string;
  numeroContrato?: string;
  codigoActivacion?: string;
  pin: string;
  aceptaHabeasData: boolean;
  versionHabeasData: string;
}

/** Crea la cuenta en el backend (verifica contrato o código) y luego inicia sesión. */
export async function registrarCuenta(datos: DatosRegistro): Promise<void> {
  const fn = httpsCallable<DatosRegistro, { ok: boolean }>(functions, "registrarCuentaAfiliadoFn");
  await fn(datos);
  await iniciarSesion(datos.cedula, datos.pin);
}

/** Mismo criterio que el backend, para avisar antes de enviar. */
export function problemaDelPin(pin: string): "largo" | "repetido" | "secuencia" | null {
  if (!new RegExp(`^\\d{${LARGO_PIN}}$`).test(pin)) return "largo";
  if (/^(\d)\1+$/.test(pin)) return "repetido";
  const d = pin.split("").map(Number);
  const pasos = d.slice(1).map((x, i) => x - d[i]);
  if (pasos.every((p) => p === 1) || pasos.every((p) => p === -1)) return "secuencia";
  return null;
}
