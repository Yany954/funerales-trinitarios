import { useEffect, useRef } from "react";

const ENFOCABLES =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

let contador = 0;

/** Hay una alerta de SweetAlert abierta encima: ella maneja Escape y el foco. */
const hayAlertaAbierta = () => !!document.querySelector(".swal2-container");

/**
 * Hace accesible un modal: pon el ref en el panel (con role="dialog" y
 * aria-modal="true"). Al abrir mueve el foco adentro, Escape lo cierra, Tab no
 * se sale del modal, el título (primer h2/h3) se anuncia como nombre del
 * diálogo, y al cerrar el foco vuelve al botón que lo abrió.
 */
export function useDialogo<T extends HTMLElement = HTMLDivElement>(onCerrar: () => void) {
  const ref = useRef<T>(null);
  const cerrarRef = useRef(onCerrar);
  cerrarRef.current = onCerrar;

  useEffect(() => {
    const panel = ref.current;
    if (!panel) return;
    const anterior = document.activeElement as HTMLElement | null;

    const titulo = panel.querySelector("h2, h3");
    if (titulo && !panel.hasAttribute("aria-labelledby")) {
      if (!titulo.id) titulo.id = `dialogo-titulo-${++contador}`;
      panel.setAttribute("aria-labelledby", titulo.id);
    }

    // Primer campo del formulario; si no hay, el panel mismo.
    const primero =
      panel.querySelector<HTMLElement>("input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled])") ??
      panel.querySelector<HTMLElement>(ENFOCABLES);
    if (primero) primero.focus();
    else {
      panel.tabIndex = -1;
      panel.focus();
    }

    function alPresionar(e: KeyboardEvent) {
      if (hayAlertaAbierta()) return;
      if (e.key === "Escape") {
        e.stopPropagation();
        cerrarRef.current();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const lista = Array.from(panel.querySelectorAll<HTMLElement>(ENFOCABLES)).filter((el) => el.offsetParent !== null);
      if (lista.length === 0) return;
      const inicio = lista[0];
      const fin = lista[lista.length - 1];
      if (e.shiftKey && document.activeElement === inicio) {
        e.preventDefault();
        fin.focus();
      } else if (!e.shiftKey && document.activeElement === fin) {
        e.preventDefault();
        inicio.focus();
      }
    }

    document.addEventListener("keydown", alPresionar);
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // que no se desplace la página de fondo
    return () => {
      document.removeEventListener("keydown", alPresionar);
      document.body.style.overflow = overflowAnterior;
      anterior?.focus?.();
    };
  }, []);

  return ref;
}
