import { useRef } from "react";
import { Paperclip, Loader2, X, FileText } from "lucide-react";
import { useSubirArchivo } from "../hooks/useSubirArchivo";

interface Props {
  carpeta: string;
  documentos: string[];
  onCambiar: (docs: string[]) => void;
}

export default function SubirDocumento({ carpeta, documentos, onCambiar }: Props) {
  const { subir, subiendo, error } = useSubirArchivo();
  const inputRef = useRef<HTMLInputElement>(null);

  async function manejarArchivos(e: React.ChangeEvent<HTMLInputElement>) {
    const archivos = Array.from(e.target.files ?? []);
    for (const archivo of archivos) {
      const url = await subir(archivo, carpeta);
      onCambiar([...documentos, url]);
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-2">
      {documentos.length > 0 && (
        <ul className="space-y-1">
          {documentos.map((url, i) => (
            <li key={i} className="flex items-center justify-between rounded-lg border border-vino-100 px-3 py-1.5 text-sm">
              <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-vino-700 hover:underline">
                <FileText size={14} /> Documento {i + 1}
              </a>
              <button type="button" onClick={() => onCambiar(documentos.filter((_, idx) => idx !== i))} className="text-tinta/40 hover:text-red-600">
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <input ref={inputRef} type="file" accept="image/*,.pdf" multiple onChange={manejarArchivos} className="hidden" />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={subiendo}
        className="flex items-center gap-2 rounded-lg border border-vino-100 px-3 py-2 text-sm text-vino-700 hover:bg-vino-50 disabled:opacity-60"
      >
        {subiendo ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
        {subiendo ? "Subiendo…" : "Adjuntar documento (foto o PDF)"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}