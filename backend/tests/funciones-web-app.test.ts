/**
 * Web (dashboard) y app móvil comparten el mismo backend: este test evita que
 * dos funciones se llamen igual o que un cliente llame a una función que no existe.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const RAIZ = resolve(__dirname, "../..");

function exportadas(): string[] {
  const idx = readFileSync(join(RAIZ, "backend/src/interfaces/index.ts"), "utf8");
  return [...idx.matchAll(/export\s*\{([^}]*)\}/g)].flatMap((m) => m[1].split(",").map((n) => n.trim()).filter(Boolean));
}

function archivos(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const ruta = join(dir, n);
    if (n === "node_modules") return [];
    return statSync(ruta).isDirectory() ? archivos(ruta) : /\.tsx?$/.test(n) ? [ruta] : [];
  });
}

function llamadas(carpeta: string): Set<string> {
  const nombres = new Set<string>();
  for (const f of archivos(join(RAIZ, carpeta))) {
    for (const m of readFileSync(f, "utf8").matchAll(/httpsCallable[\s\S]*?\(\s*functions,\s*"(\w+)"/g)) nombres.add(m[1]);
  }
  return nombres;
}

describe("funciones compartidas por web y app", () => {
  const backend = exportadas();

  it("no hay dos funciones con el mismo nombre", () => {
    const repetidas = backend.filter((n, i) => backend.indexOf(n) !== i);
    assert.deepEqual(repetidas, []);
  });

  it("el dashboard solo llama funciones que existen", () => {
    assert.deepEqual([...llamadas("frontend/src")].filter((n) => !backend.includes(n)), []);
  });

  it("la app solo llama funciones que existen", () => {
    assert.deepEqual([...llamadas("mobile/src")].filter((n) => !backend.includes(n)), []);
  });
});

describe("tipos compartidos backend ↔ app", () => {
  it("mobile/src/vista/tipos.ts es copia exacta de la entidad del backend", () => {
    const backend = readFileSync(join(RAIZ, "backend/src/domain/entities/vista-afiliado.ts"), "utf8");
    const app = readFileSync(join(RAIZ, "mobile/src/vista/tipos.ts"), "utf8").split("\n").slice(1).join("\n");
    assert.equal(app, backend, "Copia backend/src/domain/entities/vista-afiliado.ts a mobile/src/vista/tipos.ts");
  });
});
