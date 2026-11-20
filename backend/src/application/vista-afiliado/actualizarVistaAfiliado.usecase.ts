import { AfiliadosRepository } from "../ports/afiliados.repository";
import { PlanesRepository } from "../ports/planes.repository";
import { PagosRepository } from "../ports/pagos.repository";
import { ServiciosRepository } from "../ports/servicios.repository";
import { CuentasAfiliadoRepository } from "../ports/cuentas-afiliado.repository";
import { VistaAfiliadoRepository } from "../ports/vista-afiliado.repository";
import { Servicio } from "../../domain/entities/servicio";
import { construirVistaAfiliado } from "./construirVistaAfiliado";

export interface DependenciasVista {
  afiliados: AfiliadosRepository;
  planes: PlanesRepository;
  pagosPlan: PagosRepository;
  pagosSeguro: PagosRepository;
  servicios: ServiciosRepository;
  cuentas: CuentasAfiliadoRepository;
  vistas: VistaAfiliadoRepository;
}

/**
 * Vuelve a armar la vista de un titular. Solo existe para quien tiene cuenta
 * en la app (no se gastan escrituras en los demás). Si el afiliado se borró o
 * ya no tiene cuenta, la vista se elimina.
 */
export async function actualizarVistaAfiliado(dep: DependenciasVista, afiliadoId: string): Promise<void> {
  const [afiliado, cuenta] = await Promise.all([dep.afiliados.obtenerPorId(afiliadoId), dep.cuentas.obtenerCuenta(afiliadoId)]);
  if (!afiliado || !cuenta) {
    await dep.vistas.eliminar(afiliadoId);
    return;
  }

  const [plan, pagosPlan, pagosSeguro, porId, porCedula] = await Promise.all([
    afiliado.planId ? dep.planes.obtenerPorId(afiliado.planId) : Promise.resolve(null),
    dep.pagosPlan.listarPorAfiliado(afiliadoId),
    dep.pagosSeguro.listarPorAfiliado(afiliadoId),
    dep.servicios.buscarPorAfiliadoId(afiliadoId),
    afiliado.cedula?.trim() ? dep.servicios.buscarPorCedulaTitular(afiliado.cedula) : Promise.resolve([] as Servicio[]),
  ]);

  // Un servicio puede estar enlazado por afiliadoId, por la cédula del titular o por ambos.
  const servicios = new Map<string, Servicio>();
  [...porId, ...porCedula].forEach((s) => servicios.set(s.id, s));

  await dep.vistas.guardar(
    construirVistaAfiliado({
      afiliado,
      nombrePlan: plan?.nombre ?? null,
      beneficiosGuardados: plan?.beneficios,
      pagosPlan,
      pagosSeguro,
      servicios: [...servicios.values()],
    })
  );
}
