import { useState, useEffect } from "react";
import { parsearPesosCOP, formatearPesosCOP } from "../utils/precio";

interface Props {
  name: string;
  placeholder?: string;
  valorInicial?: number;
  required?: boolean;
}

/**
 * Input de precio en COP. Acepta que la persona escriba con punto, coma o
 * apóstrofe — se entiende igual, y se muestra formateado con puntos de
 * miles mientras se escribe. Por dentro sigue siendo un <input> normal con
 * ese `name`, así que ningún formulario que ya lo use necesita cambiar su
 * lógica de guardado — solo reemplazas el <input type="number"> por esto.
 */
export default function CampoPrecio({ name, placeholder, valorInicial, required }: Props) {
  const [texto, setTexto] = useState(valorInicial ? formatearPesosCOP(valorInicial) : "");

  useEffect(() => {
    setTexto(valorInicial ? formatearPesosCOP(valorInicial) : "");
  }, [valorInicial]);

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-tinta/40">$</span>
      <input
        type="text"
        inputMode="numeric"
        value={texto}
        onChange={(e) => {
          const numero = parsearPesosCOP(e.target.value);
          setTexto(numero ? formatearPesosCOP(numero) : "");
        }}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-lg border border-vino-100 py-2 pl-6 pr-3 text-sm"
      />
      <input type="hidden" name={name} value={texto ? String(parsearPesosCOP(texto)) : ""} />
    </div>
  );
}