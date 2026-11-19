/**
 * Tests de reglas de Firestore para la app de afiliados.
 * Corre con: npm run test:reglas (levanta el emulador de Firestore solo).
 */
import { after, before, beforeEach, describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes } from "firebase/storage";

let env: RulesTestEnvironment;

const titular = { rol: "afiliado", afiliadoId: "af1" };

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-reglas-afiliado",
    firestore: {
      rules: readFileSync(resolve(__dirname, "../../firestore.rules"), "utf8"),
      host: "127.0.0.1",
      port: 3035,
    },
    storage: {
      rules: readFileSync(resolve(__dirname, "../../storage.rules"), "utf8"),
      host: "127.0.0.1",
      port: 9199,
    },
  });
});

after(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "afiliados/af1"), { nombreCompleto: "Titular Uno", sede: "Pailitas" });
    await setDoc(doc(db, "afiliados/af2"), { nombreCompleto: "Titular Dos", sede: "Pelaya" });
    await setDoc(doc(db, "cuentas_afiliado/af1"), { afiliadoId: "af1", sede: "Pailitas", uid: "u1" });
    await setDoc(doc(db, "cuentas_afiliado/af2"), { afiliadoId: "af2", sede: "Pelaya", uid: "u2" });
    await setDoc(doc(db, "codigos_activacion/af1"), { hash: "x" });
    await setDoc(doc(db, "pagos/p1"), { afiliadoId: "af1", sede: "Pailitas" });
    await setDoc(doc(db, "planes_funerarios/plan1"), { nombre: "Básico" });
    await setDoc(doc(db, "vista_afiliado/af1"), { afiliadoId: "af1", nombreCompleto: "Titular Uno" });
    await setDoc(doc(db, "vista_afiliado/af2"), { afiliadoId: "af2", nombreCompleto: "Titular Dos" });
  });
});

describe("titular con rol afiliado", () => {
  it("lee SU vista y SU cuenta", async () => {
    const db = env.authenticatedContext("u1", titular).firestore();
    await assertSucceeds(getDoc(doc(db, "vista_afiliado/af1")));
    await assertSucceeds(getDoc(doc(db, "cuentas_afiliado/af1")));
  });

  it("NO lee el documento interno, ni siquiera el suyo (observaciones, certificados…)", async () => {
    const db = env.authenticatedContext("u1", titular).firestore();
    await assertFails(getDoc(doc(db, "afiliados/af1")));
  });

  it("NO lee la vista ni la cuenta de otro titular", async () => {
    const db = env.authenticatedContext("u1", titular).firestore();
    await assertFails(getDoc(doc(db, "vista_afiliado/af2")));
    await assertFails(getDoc(doc(db, "cuentas_afiliado/af2")));
  });

  it("NO escribe nada, ni siquiera lo suyo", async () => {
    const db = env.authenticatedContext("u1", titular).firestore();
    await assertFails(setDoc(doc(db, "afiliados/af1"), { estadoPlan: "activo" }, { merge: true }));
    await assertFails(setDoc(doc(db, "cuentas_afiliado/af1"), { uid: "otro" }));
    await assertFails(setDoc(doc(db, "vista_afiliado/af1"), { plan: { cuotaMensual: 0 } }, { merge: true }));
  });

  it("NO lee códigos de activación, ni datos del dashboard (todavía)", async () => {
    const db = env.authenticatedContext("u1", titular).firestore();
    await assertFails(getDoc(doc(db, "codigos_activacion/af1")));
    await assertFails(getDoc(doc(db, "pagos/p1")));
    await assertFails(getDoc(doc(db, "planes_funerarios/plan1")));
  });

  it("un token de afiliado sin afiliadoId no lee nada", async () => {
    const db = env.authenticatedContext("u9", { rol: "afiliado" }).firestore();
    await assertFails(getDoc(doc(db, "vista_afiliado/af1")));
  });
});

describe("cuentas sin rol y staff (no debe cambiar)", () => {
  it("una cuenta sin rol no lee nada", async () => {
    const db = env.authenticatedContext("intruso", {}).firestore();
    await assertFails(getDoc(doc(db, "afiliados/af1")));
    await assertFails(getDoc(doc(db, "cuentas_afiliado/af1")));
  });

  it("admin lee cualquier afiliado y cuenta", async () => {
    const db = env.authenticatedContext("admin", { rol: "admin", sede: "all" }).firestore();
    await assertSucceeds(getDoc(doc(db, "afiliados/af2")));
    await assertSucceeds(getDoc(doc(db, "cuentas_afiliado/af2")));
  });

  it("empleado solo lee cuentas de su sede", async () => {
    const db = env.authenticatedContext("emp", { rol: "empleado", sede: "Pailitas" }).firestore();
    await assertSucceeds(getDoc(doc(db, "cuentas_afiliado/af1")));
    await assertFails(getDoc(doc(db, "cuentas_afiliado/af2")));
  });

  it("nadie del staff lee códigos de activación", async () => {
    const db = env.authenticatedContext("admin", { rol: "admin", sede: "all" }).firestore();
    await assertFails(getDoc(doc(db, "codigos_activacion/af1")));
  });
});

describe("Storage: foto de perfil del titular", () => {
  const imagen = new Uint8Array([137, 80, 78, 71]);

  it("sube una imagen a SU carpeta", async () => {
    const st = env.authenticatedContext("u1", titular).storage();
    await assertSucceeds(uploadBytes(ref(st, "perfiles/af1/foto.jpg"), imagen, { contentType: "image/jpeg" }));
  });

  it("NO sube a la carpeta de otro titular", async () => {
    const st = env.authenticatedContext("u1", titular).storage();
    await assertFails(uploadBytes(ref(st, "perfiles/af2/foto.jpg"), imagen, { contentType: "image/jpeg" }));
  });

  it("NO sube archivos que no son imagen", async () => {
    const st = env.authenticatedContext("u1", titular).storage();
    await assertFails(uploadBytes(ref(st, "perfiles/af1/x.html"), imagen, { contentType: "text/html" }));
  });

  it("NO sube a carpetas del staff (contratos, servicios, pagos)", async () => {
    const st = env.authenticatedContext("u1", titular).storage();
    await assertFails(uploadBytes(ref(st, "afiliados/Pailitas/af1/contrato/x.jpg"), imagen, { contentType: "image/jpeg" }));
    await assertFails(uploadBytes(ref(st, "pagos/x.jpg"), imagen, { contentType: "image/jpeg" }));
  });
});
