

import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

initializeApp({ projectId: "funerales-trinitarios" }); // sin cert() — el emulador no valida credenciales

const EMAIL = "yanygonzalezyepez@gmail.com"; // ⚠️ ojo abajo — mira qué correo usaste de verdad

async function main() {
  const usuario = await getAuth().getUserByEmail(EMAIL);
  await getAuth().setCustomUserClaims(usuario.uid, { rol: "admin", sede: "all" });
  console.log(`Listo — ${EMAIL} (uid ${usuario.uid}) ahora es admin en el emulador.`);
}

main();