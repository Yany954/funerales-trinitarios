import { Image, Linking, Pressable, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Aviso, Pantalla, Parrafo, Titulo } from "@/components/ui";
import { ConVista } from "@/components/ConVista";
import { RADIO, colores, espacio } from "@/theme";

/** Fotos del contrato físico que sube el staff desde el dashboard. */
export default function Contrato() {
  const { t } = useTranslation();
  return (
    <ConVista conEncabezado>
      {(v) => (
        <Pantalla conEncabezado>
          {v.numeroContrato ? <Titulo>{t("contrato.numero", { numero: v.numeroContrato })}</Titulo> : null}
          {v.contratoFotos.length === 0 ? (
            <Aviso tipo="info">{t("contrato.noDisponible")}</Aviso>
          ) : (
            <>
              <Parrafo suave>{t("contrato.ampliar")}</Parrafo>
              {v.contratoFotos.map((url, i) => (
                <Pressable key={url} onPress={() => Linking.openURL(url)} accessibilityRole="imagebutton" accessibilityLabel={t("contrato.foto", { n: i + 1 })}>
                  <View style={estilos.marco}>
                    <Image source={{ uri: url }} style={estilos.foto} resizeMode="contain" />
                  </View>
                </Pressable>
              ))}
            </>
          )}
        </Pantalla>
      )}
    </ConVista>
  );
}

const estilos = StyleSheet.create({
  marco: { backgroundColor: colores.blanco, borderRadius: RADIO, borderWidth: 1, borderColor: colores.borde, padding: espacio.s },
  foto: { width: "100%", aspectRatio: 3 / 4 },
});
