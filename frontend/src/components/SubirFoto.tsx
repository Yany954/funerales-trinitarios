import { useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { useSubirArchivo } from "../hooks/useSubirArchivo";

interface Props {
  carpeta: string;
  valorActual?: string;
  onSubido: (url: string) => void;
}

export default function SubirFoto({ carpeta, valorActual, onSubido }: Props) {
  const { subir, subiendo, error } = useSubirArchivo();
  const [preview, setPreview] = useState<string | null>(valorActual ?? null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function manejarArchivo(e: React.ChangeEvent<HTMLInputElement>) {
  const archivo = e.target.files?.[0];
  if (!archivo) return;
  setPreview(URL.createObjectURL(archivo));
  try {
    const url = await subir(archivo, carpeta);
    onSubido(url);
  } catch {
    setPreview(null); // el error ya se muestra abajo vía `error` del hook
  }
}

  return (
    <div className="space-y-2">
      {preview && (
        <div className="relative w-24">
          <img src={preview} alt="" className="h-24 w-24 rounded-lg border border-vino-100 object-cover" />
          <button
            type="button"
            onClick={() => { setPreview(null); onSubido(""); }}
            className="absolute -right-2 -top-2 rounded-full border border-vino-100 bg-white p-0.5 text-tinta/50 shadow"
          >
            <X size={14} />
          </button>
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" onChange={manejarArchivo} className="hidden" />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={subiendo}
        className="flex items-center gap-2 rounded-lg border border-vino-100 px-3 py-2 text-sm text-vino-700 hover:bg-vino-50 disabled:opacity-60"
      >
        {subiendo ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
        {subiendo ? "Subiendo…" : preview ? "Cambiar foto" : "Tomar foto o elegir de galería"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}