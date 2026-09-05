import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

// Se inicializa una sola vez, sin importar cuántas funciones lo importen.
if (getApps().length === 0) {
  initializeApp();
}

export const db = getFirestore();
export { Timestamp };
