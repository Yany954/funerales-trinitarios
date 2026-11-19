import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Boton, Marca, Pantalla, Parrafo, Titulo } from "@/components/ui";
import { espacio } from "@/theme";

export default function Bienvenida() {
  const { t } = useTranslation();
  return (
    <Pantalla>
      <View style={estilos.cabecera}>
        <Marca grande subtitulo="Funerales" />
        <View style={estilos.textos}>
          <Titulo>{t("bienvenida.titulo")}</Titulo>
          <Parrafo>{t("bienvenida.subtitulo")}</Parrafo>
        </View>
      </View>
      <View style={estilos.botones}>
        <Boton titulo={t("bienvenida.ingresar")} onPress={() => router.push("/ingresar")} />
        <Boton titulo={t("bienvenida.crearCuenta")} variante="secundario" onPress={() => router.push("/registro")} />
        <Parrafo suave>{t("bienvenida.ayuda")}</Parrafo>
      </View>
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  cabecera: { flex: 1, justifyContent: "center", gap: espacio.xl, paddingTop: espacio.xl },
  textos: { alignItems: "center", gap: espacio.s },
  botones: { gap: espacio.m, paddingBottom: espacio.l },
});
