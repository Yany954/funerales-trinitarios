import { useState } from "react";
import { X } from "lucide-react";

interface Props {
  src?: string;
  alt?: string;
  className?: string;
}

export default function ImagenAmpliable({ src, alt = "", className }: Props) {
  const [abierta, setAbierta] = useState(false);

  if (!src) return <div className={className ?? "h-10 w-10 rounded-md bg-vino-50"} />;

  return (
    <>
      <img
        src={src}
        alt={alt}
        onClick={() => setAbierta(true)}
        className={(className ?? "h-10 w-10 rounded-md object-cover") + " cursor-zoom-in"}
      />
      {abierta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-tinta/80 p-4" onClick={() => setAbierta(false)}>
          <button className="absolute right-4 top-4 text-white" onClick={() => setAbierta(false)}><X size={28} /></button>
          <img src={src} alt={alt} className="max-h-[85vh] max-w-full rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  );
}