import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Boton, Chip, FilaDato, Pantalla, Tarjeta, Titulo, tonoEstado } from "@/components/ui";
import { ConVista } from "@/components/ConVista";
import { formatoFecha, formatoPesos } from "@/utils/formato";
import { colores, espacio, fuentes, texto } from "@/theme";

/** Inicio: de un vistazo, ¿estoy al día? ¿cuánto pago? ¿hasta cuándo estoy cubierto? */
export default function Inicio() {
  const { t } = useTranslation();
  return (
    <ConVista>
      {(v) => (
        <Pantalla>
          <Titulo>{t("inicio.hola", { nombre: v.nombreCompleto.split(" ")[0] })}</Titulo>

          {v.plan && (
            <Tarjeta titulo={t("plan.titulo")}>
              <Text style={estilos.subtitulo}>
                {[v.plan.nombre && t("plan.plan", { nombre: v.plan.nombre }), v.numeroContrato && t("plan.contrato", { numero: v.numeroContrato })].filter(Boolean).join(" · ")}
              </Text>
              <Chip texto={t(`estados.${v.plan.estado}`)} tono={tonoEstado(v.plan.estado)} />
              <Text style={estilos.mensaje}>
                {v.plan.estado === "inactivo"
                  ? t("plan.inactivo")
                  : v.plan.estado === "en mora"
                    ? t("plan.enMora", { fecha: formatoFecha(v.plan.cubiertoHasta) })
                    : t("plan.alDia", { fecha: formatoFecha(v.plan.cubiertoHasta) })}
              </Text>
              <FilaDato etiqueta={t("plan.cuota")} valor={formatoPesos(v.plan.cuotaMensual)} />
            </Tarjeta>
          )}

          {v.seguroVida && (
            <Tarjeta titulo={t("seguro.titulo")}>
              <Chip texto={t(`estados.${v.seguroVida.estado}`)} tono={tonoEstado(v.seguroVida.estado)} />
              <FilaDato etiqueta={t("seguro.cuota")} valor={formatoPesos(v.seguroVida.precioMensual)} />
              <FilaDato etiqueta={t("seguro.indemnizacion")} valor={formatoPesos(v.seguroVida.valorIndemnizacion)} />
              <FilaDato etiqueta={t("plan.cubiertoHasta")} valor={formatoFecha(v.seguroVida.cubiertoHasta)} />
            </Tarjeta>
          )}

          <View style={estilos.botones}>
            {v.plan && <Boton titulo={t("plan.verBeneficios")} variante="secundario" icono="ribbon-outline" onPress={() => router.push("/beneficios")} />}
            {v.servicios.length > 0 && <Boton titulo={t("plan.verServicios")} variante="secundario" onPress={() => router.push("/servicios")} />}
          </View>
        </Pantalla>
      )}
    </ConVista>
  );
}

const estilos = StyleSheet.create({
  subtitulo: { fontFamily: fuentes.texto, fontSize: texto.normal, color: colores.tintaSuave },
  mensaje: { fontFamily: fuentes.texto, fontSize: texto.normal, lineHeight: texto.normal * 1.4, color: colores.tinta },
  botones: { gap: espacio.m },
});
