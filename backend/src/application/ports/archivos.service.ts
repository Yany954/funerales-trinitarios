/** Puerto: archivos en Storage (fotos de perfil que sube la app). */
export interface ArchivosService {
  /** true si el archivo existe y es una imagen de tamaño razonable. */
  esImagenValida(ruta: string): Promise<boolean>;
  /** Enlace de descarga permanente para mostrar la imagen. */
  urlDescarga(ruta: string): Promise<string>;
}
