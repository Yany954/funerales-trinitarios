/** Tests de las reglas puras de la cuenta de la app (no necesitan emulador). */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  correoInternoAfiliado,
  normalizarContrato,
  problemaDelPin,
  variantesCedula,
} from "../src/domain/value-objects/cuenta-app";

describe("PIN", () => {
  it("acepta un PIN de 6 números no obvio", () => {
    assert.equal(problemaDelPin("482915"), null);
  });
  it("rechaza largo incorrecto, letras, repetidos y secuencias", () => {
    for (const malo of ["12345", "1234567", "12a456", "000000", "777777", "123456", "654321", "345678"]) {
      assert.notEqual(problemaDelPin(malo), null, malo);
    }
  });
});

describe("cédula y contrato", () => {
  it("el correo interno no depende de puntos ni espacios", () => {
    assert.equal(correoInternoAfiliado("1.234.567"), correoInternoAfiliado(" 1234567 "));
  });
  it("variantes cubren con y sin puntos", () => {
    assert.deepEqual(variantesCedula("1234567").sort(), ["1.234.567", "1234567"].sort());
    assert.ok(variantesCedula("1.234.567").includes("1234567"));
  });
  it("contrato ignora ceros a la izquierda y separadores", () => {
    assert.equal(normalizarContrato("00123"), "123");
    assert.equal(normalizarContrato("A-12 3"), "A123");
    assert.equal(normalizarContrato("0"), "0");
  });
});
