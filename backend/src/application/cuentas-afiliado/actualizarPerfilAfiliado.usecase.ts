import { AfiliadosRepository } from "../ports/afiliados.repository";
import { ArchivosService } from "../ports/archivos.service";
import { Afiliado } from "../../domain/entities/afiliado";
import { MetadataCambio } from "../../domain/value-objects/metadata-cambio";
import { normalizarCelular } from "../../domain/value-objects/celular";
import { ErrorRegistro } from "./registrarCuentaAfiliado.usecase";

export interface ActualizarPerfilAfiliadoInput {
  /** "" quita el celular. */
  celular?: string;
  /** Ruta en Storage de la foto que acaba de subir la app: perfiles/{afiliadoId}/... */
  fotoPerfilRuta?: string;
}

/**
 * Lo ÚNICO que el titular puede cambiar de sus datos desde la app: celular y
 * foto de perfil. Nombre, cédula, contrato, plan, cuota y pagos NO se tocan aquí.
 */
export async function actualizarPerfilAfiliado(
  afiliados: AfiliadosRepository,
  archivos: ArchivosService,
  afiliadoId: string,
  input: ActualizarPerfilAfiliadoInput,
  metadata: MetadataCambio
): Promise<void> {
  const cambios: Partial<Omit<Afiliado, "id">> = {};

  if (input.celular !== undefined) {
    if (input.celular.trim() === "") {
      cambios.celular = "";
    } else {
      const celular = normalizarCelular(input.celular);
      if (!celular) throw new ErrorRegistro("Escribe un celular de 10 números que empiece por 3.");
      cambios.celular = celular;
    }
  }

  if (input.fotoPerfilRuta !== undefined) {
    // Solo su propia carpeta: nadie puede poner como foto un archivo ajeno.
    if (!input.fotoPerfilRuta.startsWith(`perfiles/${afiliadoId}/`)) {
      throw new ErrorRegistro("La foto no es válida.");
    }
    if (!(await archivos.esImagenValida(input.fotoPerfilRuta))) {
      throw new ErrorRegistro("La foto no es válida. Usa una imagen de menos de 5 MB.");
    }
    cambios.fotoPerfilURL = await archivos.urlDescarga(input.fotoPerfilRuta);
  }

  if (Object.keys(cambios).length === 0) return;
  await afiliados.actualizar(afiliadoId, { ...cambios, metadata });
}
