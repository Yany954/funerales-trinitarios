/** Flujo de registro de la app con repositorios en memoria (sin Firebase). */
import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { registrarCuentaAfiliado, RegistrarCuentaAfiliadoInput } from "../src/application/cuentas-afiliado/registrarCuentaAfiliado.usecase";
import { generarCodigoActivacion } from "../src/application/cuentas-afiliado/codigoActivacion";
import { restablecerAccesoApp } from "../src/application/cuentas-afiliado/restablecerAccesoApp.usecase";
import type { AuthAfiliadosService, CuentasAfiliadoRepository } from "../src/application/ports/cuentas-afiliado.repository";
import type { AfiliadosRepository } from "../src/application/ports/afiliados.repository";
import type { Afiliado } from "../src/domain/entities/afiliado";
import type { CodigoActivacion, CuentaAfiliado, IntentosRegistro } from "../src/domain/entities/cuenta-afiliado";
import { normalizarCedula } from "../src/domain/value-objects/cedula";

function afiliado(id: string, cedula: string, numeroContrato: string, soloSeguro = false): Afiliado {
  return { id, cedula, numeroContrato, soloSeguro, nombreCompleto: `Titular ${id}`, sede: "Pailitas" } as Afiliado;
}

let afiliados: Afiliado[];
let cuentas: Map<string, CuentaAfiliado>;
let codigos: Map<string, CodigoActivacion>;
let intentos: Map<string, IntentosRegistro>;
let usuariosAuth: Map<string, { uid: string; claims: Record<string, unknown>; pin: string }>;

const afiliadosRepo = {
  obtenerPorId: async (id: string) => afiliados.find((a) => a.id === id) ?? null,
  buscarTitularesPorCedula: async (c: string) => afiliados.filter((a) => normalizarCedula(a.cedula) === normalizarCedula(c)),
} as unknown as AfiliadosRepository;

const cuentasRepo: CuentasAfiliadoRepository = {
  obtenerCuenta: async (id) => cuentas.get(id) ?? null,
  reservarCuenta: async (c) => {
    if (cuentas.has(c.afiliadoId)) throw new Error("ya existe");
    cuentas.set(c.afiliadoId, { ...c, uid: "" });
  },
  confirmarCuenta: async (id, uid) => void (cuentas.get(id)!.uid = uid),
  eliminarCuenta: async (id) => void cuentas.delete(id),
  guardarCodigo: async (c) => void codigos.set(c.afiliadoId, c),
  obtenerCodigo: async (id) => codigos.get(id) ?? null,
  marcarCodigoUsado: async (id) => void (codigos.get(id)!.usado = true),
  obtenerIntentos: async (c) => intentos.get(c) ?? { fallidos: 0, bloqueadoHasta: null },
  guardarIntentos: async (c, i) => void intentos.set(c, i),
  limpiarIntentos: async (c) => void intentos.delete(c),
};

const auth: AuthAfiliadosService = {
  buscarPorCorreo: async (correo) => usuariosAuth.get(correo) ?? null,
  crear: async (correo, pin, _nombre, claims) => {
    const uid = `uid-${usuariosAuth.size + 1}`;
    usuariosAuth.set(correo, { uid, claims: { ...claims }, pin });
    return uid;
  },
  eliminar: async (uid) => {
    for (const [k, v] of usuariosAuth) if (v.uid === uid) usuariosAuth.delete(k);
  },
};

const base = (extra: Partial<RegistrarCuentaAfiliadoInput>): RegistrarCuentaAfiliadoInput => ({
  cedula: "1.234.567",
  pin: "482915",
  aceptaHabeasData: true,
  versionHabeasData: "test-v1",
  ...extra,
});
const registrar = (extra: Partial<RegistrarCuentaAfiliadoInput>) => registrarCuentaAfiliado(afiliadosRepo, cuentasRepo, auth, base(extra));

beforeEach(() => {
  afiliados = [afiliado("af1", "1234567", "00123"), afiliado("seg1", "7654321", "", true)];
  cuentas = new Map();
  codigos = new Map();
  intentos = new Map();
  usuariosAuth = new Map();
});

describe("registro con número de contrato", () => {
  it("crea la cuenta con rol afiliado y guarda Habeas Data", async () => {
    await registrar({ numeroContrato: "123" });
    const cuenta = cuentas.get("af1")!;
    assert.equal(cuenta.metodoVinculacion, "contrato");
    assert.equal(cuenta.habeasData.version, "test-v1");
    const usuario = [...usuariosAuth.values()][0];
    assert.deepEqual(usuario.claims, { rol: "afiliado", afiliadoId: "af1" });
    assert.equal(cuenta.uid, usuario.uid);
  });

  it("contrato equivocado → mensaje genérico, y bloquea al 5.º intento", async () => {
    for (let i = 0; i < 5; i++) {
      await assert.rejects(registrar({ numeroContrato: "999" }), /no coinciden/);
    }
    await assert.rejects(registrar({ numeroContrato: "123" }), /Demasiados intentos/);
  });

  it("cédula inexistente da el mismo mensaje que contrato equivocado", async () => {
    await assert.rejects(registrar({ cedula: "99999999", numeroContrato: "123" }), /no coinciden/);
  });

  it("no permite una segunda cuenta para el mismo titular", async () => {
    await registrar({ numeroContrato: "123" });
    await assert.rejects(registrar({ numeroContrato: "123", pin: "593817" }), /Ya existe una cuenta/);
  });

  it("exige Habeas Data y un PIN no obvio", async () => {
    await assert.rejects(registrar({ numeroContrato: "123", aceptaHabeasData: false }), /tratamiento de datos/);
    await assert.rejects(registrar({ numeroContrato: "123", pin: "123456" }), /secuencia/);
  });

  it("borra una cuenta de Auth creada a mano con el mismo correo (sin vínculo)", async () => {
    usuariosAuth.set("1234567@afiliados.trinitarios.app", { uid: "intruso", claims: {}, pin: "x" });
    await registrar({ numeroContrato: "123" });
    assert.notEqual(usuariosAuth.get("1234567@afiliados.trinitarios.app")!.uid, "intruso");
  });
});

describe("registro con código de activación (solo seguro)", () => {
  it("el titular de solo seguro NO entra con contrato, sí con código", async () => {
    afiliados[1].numeroContrato = "555"; // aunque tuviera un número guardado, no cuenta
    await assert.rejects(registrar({ cedula: "7654321", numeroContrato: "555" }), /no coinciden/);
    const { codigo } = await generarCodigoActivacion(cuentasRepo, afiliadosRepo, "seg1", "staff1");
    assert.match(codigo, /^[A-Z2-9]{3}-[A-Z2-9]{3}$/);
    await registrar({ cedula: "7654321", codigoActivacion: codigo.toLowerCase() });
    assert.equal(cuentas.get("seg1")!.metodoVinculacion, "codigo");
    assert.equal(codigos.get("seg1")!.usado, true);
  });

  it("el código es de un solo uso y vence", async () => {
    const { codigo } = await generarCodigoActivacion(cuentasRepo, afiliadosRepo, "seg1", "staff1");
    await registrar({ cedula: "7654321", codigoActivacion: codigo });
    await restablecerAccesoApp(cuentasRepo, auth, "seg1");
    await assert.rejects(registrar({ cedula: "7654321", codigoActivacion: codigo }), /no coinciden/);

    const nuevo = await generarCodigoActivacion(cuentasRepo, afiliadosRepo, "seg1", "staff1");
    codigos.get("seg1")!.expira = new Date(Date.now() - 1000);
    await assert.rejects(registrar({ cedula: "7654321", codigoActivacion: nuevo.codigo }), /no coinciden/);
  });

  it("un código de OTRO titular no sirve", async () => {
    const { codigo } = await generarCodigoActivacion(cuentasRepo, afiliadosRepo, "seg1", "staff1");
    await assert.rejects(registrar({ codigoActivacion: codigo }), /no coinciden/);
  });
});

describe("restablecer acceso", () => {
  it("borra la cuenta y permite registrarse de nuevo con otro PIN", async () => {
    await registrar({ numeroContrato: "123" });
    await restablecerAccesoApp(cuentasRepo, auth, "af1");
    assert.equal(cuentas.size, 0);
    assert.equal(usuariosAuth.size, 0);
    await registrar({ numeroContrato: "123", pin: "593817" });
    assert.equal([...usuariosAuth.values()][0].pin, "593817");
  });
});
