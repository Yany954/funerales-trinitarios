/** Vista de la app: que muestre lo correcto y NUNCA datos internos. */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { construirVistaAfiliado } from "../src/application/vista-afiliado/construirVistaAfiliado";
import { actualizarPerfilAfiliado } from "../src/application/cuentas-afiliado/actualizarPerfilAfiliado.usecase";
import { normalizarCelular } from "../src/domain/value-objects/celular";
import type { Afiliado } from "../src/domain/entities/afiliado";
import type { Pago } from "../src/domain/entities/pago";
import type { Servicio } from "../src/domain/entities/servicio";
import type { AfiliadosRepository } from "../src/application/ports/afiliados.repository";

const meta = { tipo: "humano", canal: "dashboard-web", identificador: "uid-staff-secreto", fecha: new Date() } as const;
const d = (s: string) => new Date(`${s}T00:00:00.000Z`);

function afiliado(extra: Partial<Afiliado> = {}): Afiliado {
  return {
    id: "af1",
    nombreCompleto: "Ana Pérez",
    cedula: "1.234.567",
    numeroContrato: "123",
    sede: "Pailitas",
    planId: "p1",
    fechaAfiliacion: d("2024-03-10"),
    fechaAfiliacionReal: d("2024-03-10"),
    valorCuotaMensual: 25000,
    estadoPlan: "activo",
    periodoCubiertoHasta: "2026-10",
    ultimoPago: null,
    tieneSeguroVida: false,
    observaciones: "NOTA INTERNA: debe 2 meses de antes",
    beneficiarios: [
      { nombre: "Hijo Uno", parentesco: "Hijo", cedula: "99887766", fechaAdicion: d("2024-03-10") },
      { nombre: "Abuela", parentesco: "Madre", cedula: "", fechaAdicion: d("2024-03-10"), fallecido: true, fechaFallecimiento: d("2025-05-01"), certificadoDefuncionURL: "https://storage/certificado-secreto.pdf" },
      { nombre: "Sobrino", parentesco: "Sobrino", cedula: "1111", fechaAdicion: d("2024-03-10"), novedades: [{ tipo: "retiro", fecha: d("2025-01-01"), motivo: "motivo interno" }] },
    ],
    metadata: meta,
    ...extra,
  } as Afiliado;
}

function pago(i: number): Pago {
  return { id: `p${i}`, afiliadoId: "af1", sede: "Pailitas", fecha: d(`2025-${String((i % 12) + 1).padStart(2, "0")}-05`), valor: 25000, periodoCubierto: `2025-${String((i % 12) + 1).padStart(2, "0")}`, comprobanteURL: "https://storage/comprobante-secreto.jpg", metadata: meta };
}

const servicio = {
  id: "s1", fechaServicio: d("2025-05-02"), sede: "Pailitas", convenioId: "c1", afiliadoId: "af1",
  fallecido: { nombreCompleto: "Abuela", cedula: "555" }, tipoServicio: "servicio completo", tipoTraslado: "local",
  usoBoveda: { usada: false }, tuvoMisaOCulto: "misa", registroDefuncionAdjuntoURL: "https://storage/registro-secreto.pdf",
  itemsServicio: [{ concepto: "Cofre", cantidad: 1, valorUnitario: 900000, valorTotal: 900000 }], valorTotal: 1500000,
  estadoFacturacion: "pagado", documentosAdjuntos: ["https://storage/doc-secreto.pdf"], observaciones: "nota interna servicio",
  facturaURL: "https://storage/factura-secreta.pdf", metadata: meta, esAfiliado: true, tipoPago: "afiliado",
} as unknown as Servicio;

const vista = (extra: Partial<Afiliado> = {}) =>
  construirVistaAfiliado({ afiliado: afiliado(extra), nombrePlan: "Integral", pagosPlan: Array.from({ length: 15 }, (_, i) => pago(i)), pagosSeguro: [], servicios: [servicio], hoy: d("2025-06-01") });

describe("vista del titular: privacidad", () => {
  it("no incluye observaciones, certificados, comprobantes, documentos ni quién hizo el cambio", () => {
    const texto = JSON.stringify(vista());
    for (const prohibido of ["NOTA INTERNA", "secreto", "secreta", "uid-staff", "motivo interno", "nota interna servicio", "metadata", "observaciones"]) {
      assert.ok(!texto.includes(prohibido), `la vista no debe contener "${prohibido}"`);
    }
  });

  it("cédulas parciales (titular y beneficiarios)", () => {
    const v = vista();
    assert.equal(v.cedulaParcial, "•••• 4567");
    assert.equal(v.plan!.beneficiarios[0].cedulaParcial, "•••• 7766");
    assert.equal(v.plan!.beneficiarios[1].cedulaParcial, null); // sin cédula
    assert.ok(!JSON.stringify(v).includes("1234567"));
  });
});

describe("vista del titular: contenido", () => {
  it("estado de cada beneficiario y cupo con las reglas del dashboard", () => {
    const v = vista();
    assert.deepEqual(v.plan!.beneficiarios.map((b) => b.estado), ["activo", "fallecido", "retirado"]);
    // Hijo ocupa cupo; la abuela falleció en 2025 (año de referencia) y lo mantiene; el retirado lo libera.
    assert.deepEqual(v.plan!.cupo, { usados: 2, limite: 7 });
  });

  it("cubierto hasta: mismo día del mes siguiente al último pagado", () => {
    assert.equal(vista().plan!.cubiertoHasta, "2026-11-10");
  });

  it("solo los 12 pagos más recientes, sin comprobante", () => {
    const v = vista();
    assert.equal(v.plan!.pagos.length, 12);
    assert.deepEqual(Object.keys(v.plan!.pagos[0]).sort(), ["fecha", "numeroRecibo", "periodoCubierto", "valor"]);
  });

  it("servicios usados: fecha, fallecido, valor e ítems", () => {
    const s = vista().servicios[0];
    assert.equal(s.fallecido, "Abuela");
    assert.equal(s.valorTotal, 1500000);
    assert.equal(s.tipoPago, "afiliado");
    assert.deepEqual(s.items, [{ concepto: "Cofre", cantidad: 1, valorTotal: 900000 }]);
  });

  it("titular de solo seguro: sin plan, con beneficiarios del seguro", () => {
    const v = vista({
      soloSeguro: true,
      tieneSeguroVida: true,
      seguroVida: { precioMensual: 15000, valorIndemnizacion: 5000000, fechaInicio: d("2025-01-15"), estado: "activo", periodoCubiertoHasta: "2025-05", beneficiarios: [{ nombre: "Hija", parentesco: "Hija", cedula: "777", porcentaje: 100 }] },
    });
    assert.equal(v.plan, null);
    assert.deepEqual(v.seguroVida!.beneficiarios, [{ nombre: "Hija", parentesco: "Hija", porcentaje: 100 }]);
    assert.equal(v.seguroVida!.cubiertoHasta, "2025-06-15");
  });

  it("todas las fechas son texto ISO (nunca Date)", () => {
    const v = vista();
    assert.equal(typeof v.fechaAfiliacion, "string");
    assert.equal(typeof v.plan!.pagos[0].fecha, "string");
    assert.equal(typeof v.servicios[0].fecha, "string");
  });
});

describe("perfil: lo único que el titular puede cambiar", () => {
  it("celular colombiano", () => {
    assert.equal(normalizarCelular("+57 300 123 4567"), "3001234567");
    assert.equal(normalizarCelular("(300) 123-4567"), "3001234567");
    assert.equal(normalizarCelular("6075551234"), null); // fijo
    assert.equal(normalizarCelular("30012345"), null);
  });

  it("solo guarda celular y foto, y la foto debe estar en SU carpeta", async () => {
    const guardado: Record<string, unknown>[] = [];
    const repo = { actualizar: async (_id: string, c: Record<string, unknown>) => void guardado.push(c) } as unknown as AfiliadosRepository;
    const archivos = { esImagenValida: async () => true, urlDescarga: async (r: string) => `https://dl/${r}` };
    await actualizarPerfilAfiliado(repo, archivos, "af1", { celular: "300 123 4567", fotoPerfilRuta: "perfiles/af1/f.jpg" }, meta);
    const { metadata, ...cambios } = guardado[0];
    assert.deepEqual(cambios, { celular: "3001234567", fotoPerfilURL: "https://dl/perfiles/af1/f.jpg" });
    assert.ok(metadata);
    await assert.rejects(actualizarPerfilAfiliado(repo, archivos, "af1", { fotoPerfilRuta: "perfiles/af2/f.jpg" }, meta), /no es válida/);
    await assert.rejects(actualizarPerfilAfiliado(repo, archivos, "af1", { celular: "123" }, meta), /10 números/);
  });
});

describe("beneficios del plan", () => {
  it("cada plan de la hoja trae lo suyo primero y luego lo común", async () => {
    const { beneficiosDelPlan, BENEFICIOS_COMUNES } = await import("../src/domain/value-objects/beneficios-plan");
    const girasol = beneficiosDelPlan("Girasol", undefined);
    assert.equal(girasol[0], "Cofre forrado.");
    assert.ok(girasol.includes("No cubre traslado a nivel nacional."));
    assert.ok(beneficiosDelPlan("Plan Alianza", []).includes("Cubre el 20 % del traslado a nivel nacional."));
    assert.ok(beneficiosDelPlan("BENDICIÓN", null).some((b) => b.includes("(por 2 años)")));
    assert.equal(girasol.length, 3 + BENEFICIOS_COMUNES.length);
  });

  it("los editados en el dashboard tienen prioridad; un plan desconocido no trae nada", async () => {
    const { beneficiosDelPlan } = await import("../src/domain/value-objects/beneficios-plan");
    assert.deepEqual(beneficiosDelPlan("Girasol", ["  Solo esto  ", ""]), ["Solo esto"]);
    assert.deepEqual(beneficiosDelPlan("Integral", undefined), []);
  });

  it("la vista del titular incluye los beneficios de su plan", () => {
    const v = construirVistaAfiliado({ afiliado: afiliado(), nombrePlan: "Bendiciones", pagosPlan: [], pagosSeguro: [], servicios: [] });
    assert.equal(v.plan!.beneficios[0], "Cofre tipo plan especial.");
    assert.ok(!("contratoFotos" in v));
  });
});
