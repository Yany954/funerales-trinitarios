import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import serviceAccount from "../serviceAccountKey.json";

initializeApp({ credential: cert(serviceAccount as any) });

const UID = "hTIByqR5CSZqCUnF08ahYuLSsBe2"; // Consola → Authentication → Users → columna "User UID"

getAuth()
  .setCustomUserClaims(UID, { rol: "admin", sede: "all" })
  .then(() => console.log("Listo — ya es admin."));