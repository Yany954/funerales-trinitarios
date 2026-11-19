import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { colores } from "@/theme";

/** El logo y el nombre van dentro de cada pantalla; el encabezado solo deja el botón "Atrás". */
export default function LayoutPublico() {
  const { t } = useTranslation();
  return (
    <Stack
      screenOptions={{
        title: "",
        headerTintColor: colores.vino700,
        headerStyle: { backgroundColor: colores.crema },
        headerShadowVisible: false,
        headerBackTitle: t("comun.atras"),
        contentStyle: { backgroundColor: colores.crema },
      }}
    >
      <Stack.Screen name="bienvenida" options={{ headerShown: false }} />
      <Stack.Screen name="ingresar" />
      <Stack.Screen name="registro" />
    </Stack>
  );
}
