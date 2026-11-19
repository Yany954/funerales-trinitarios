import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Chip, FilaDato, Pantalla, Parrafo, Tarjeta } from "@/components/ui";
import { ConVista } from "@/components/ConVista";
import { formatoFecha, formatoPesos } from "@/utils/formato";
import { colores, espacio, fuentes, texto } from "@/theme";

/** Servicios funerarios usados con la afiliación: a quién, cuándo, cuánto y qué incluyó. */
export default function Servicios() {
  const { t } = useTranslation();
  return (
    <ConVista conEncabezado>
      {(v) => (
        <Pantalla conEncabezado>
          {v.servicios.length === 0 ? (
            <Parrafo suave>{t("servicios.ninguno")}</Parrafo>
          ) : (
            v.servicios.map((s, i) => (
              <Tarjeta key={`${s.fecha}-${i}`} titulo={t("servicios.de", { nombre: s.fallecido })}>
                <Text style={estilos.fecha}>
                  {formatoFecha(s.fecha)} · {t(`servicios.tipo.${s.tipoServicio}`, { defaultValue: s.tipoServicio })}
                </Text>
                {s.tipoPago ? <Chip texto={t(`servicios.tipoPago.${s.tipoPago}`, { defaultValue: s.tipoPago })} tono={s.tipoPago === "afiliado" ? "exito" : "neutro"} /> : null}
                <FilaDato etiqueta={t("servicios.total")} valor={formatoPesos(s.valorTotal)} />
                {s.items.length > 0 && (
                  <View style={estilos.items}>
                    <Text style={estilos.detalleTitulo}>{t("servicios.detalle")}</Text>
                    {s.items.map((it, j) => (
                      <FilaDato key={`${it.concepto}-${j}`} etiqueta={it.cantidad > 1 ? `${it.concepto} ×${it.cantidad}` : it.concepto} valor={formatoPesos(it.valorTotal)} />
                    ))}
                  </View>
                )}
              </Tarjeta>
            ))
          )}
        </Pantalla>
      )}
    </ConVista>
  );
}

const estilos = StyleSheet.create({
  fecha: { fontFamily: fuentes.texto, fontSize: texto.normal, color: colores.tintaSuave },
  items: { gap: espacio.xs, paddingTop: espacio.s, borderTopWidth: 1, borderTopColor: colores.vino50 },
  detalleTitulo: { fontFamily: fuentes.textoFuerte, fontSize: texto.pequeno + 1, color: colores.tinta },
});
