import { useState } from "react";
import { X } from "lucide-react";

interface Props {
  src?: string;
  alt?: string;
  className?: string;
  /** Ocupa todo el ancho (para fotos grandes en tarjetas). */
  bloque?: boolean;
}

export default function ImagenAmpliable({ src, alt = "", className, bloque }: Props) {
  const [abierta, setAbierta] = useState(false);

  if (!src) return <div className={className ?? "h-10 w-10 rounded-md bg-vino-50"} />;

  return (
    <>
      <button type="button" onClick={() => setAbierta(true)} aria-label={alt ? `Ampliar imagen: ${alt}` : "Ampliar imagen"} className={bloque ? "block w-full cursor-zoom-in" : "cursor-zoom-in"}>
        <img src={src} alt={alt} className={className ?? "h-10 w-10 rounded-md object-cover"} />
      </button>
      {abierta && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={alt || "Imagen ampliada"}
          onKeyDown={(e) => e.key === "Escape" && setAbierta(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-tinta/80 p-4"
          onClick={() => setAbierta(false)}
        >
          <button type="button" autoFocus aria-label="Cerrar imagen" className="absolute right-4 top-4 text-white" onClick={() => setAbierta(false)}><X size={28} aria-hidden="true" /></button>
          <img src={src} alt={alt} className="max-h-[85vh] max-w-full rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  );
}