import { useState } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../api/client";

export function useSubirArchivo() {
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function subir(archivo: File, carpeta: string): Promise<string> {
    setSubiendo(true);
    setError(null);
    try {
      const nombreUnico = `${Date.now()}_${archivo.name}`;
      const referencia = ref(storage, `${carpeta}/${nombreUnico}`);
      await uploadBytes(referencia, archivo);
      return await getDownloadURL(referencia);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir el archivo.");
      throw err;
    } finally {
      setSubiendo(false);
    }
  }

  return { subir, subiendo, error };
}