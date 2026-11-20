import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { VistaProvider } from "@/vista/VistaContext";
import { colores, fuentes } from "@/theme";

/** Zona del titular con sesión: pestañas + pantallas de detalle (contrato, servicios). */
export default function LayoutPrivado() {
  const { t } = useTranslation();
  return (
    <VistaProvider>
      <Stack
        screenOptions={{
          headerTintColor: colores.vino700,
          headerStyle: { backgroundColor: colores.crema },
          headerTitleStyle: { fontFamily: fuentes.titulo, color: colores.vino900 },
          headerShadowVisible: false,
          headerBackTitle: t("comun.atras"),
          contentStyle: { backgroundColor: colores.crema },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="beneficios" options={{ title: t("beneficios.titulo") }} />
        <Stack.Screen name="servicios" options={{ title: t("servicios.titulo") }} />
      </Stack>
    </VistaProvider>
  );
}
