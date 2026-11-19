import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useVista } from "@/vista/VistaContext";
import type { VistaAfiliado } from "@/vista/tipos";
import { Aviso, Cargando, Pantalla } from "./ui";

/** Muestra "cargando" o el error una sola vez; las pantallas reciben la vista ya lista. */
export function ConVista({ children, conEncabezado }: { children: (vista: VistaAfiliado) => ReactNode; conEncabezado?: boolean }) {
  const { t } = useTranslation();
  const { vista, cargando } = useVista();
  if (cargando) return <Cargando />;
  if (!vista) {
    return (
      <Pantalla conEncabezado={conEncabezado}>
        <Aviso>{t("errores.sinAfiliado")}</Aviso>
      </Pantalla>
    );
  }
  return <>{children(vista)}</>;
}
