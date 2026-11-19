import "@/i18n";
import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { Fraunces_600SemiBold } from "@expo-google-fonts/fraunces";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from "@expo-google-fonts/inter";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SesionProvider, useSesion } from "@/auth/SesionContext";
import { PantallaLogo } from "@/components/ui";

// El splash nativo (beige con el logo) se queda hasta que carguen las letras y la sesión.
SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * Raíz de la app. Las rutas protegidas se eligen con Stack.Protected:
 * sin sesión de afiliado solo existen las pantallas públicas (bienvenida,
 * ingresar, registro); con sesión, solo las privadas. Cuando la sesión cambia,
 * el router vuelve a "index", que redirige a la pantalla que corresponde.
 */
function Navegacion({ fuentesListas }: { fuentesListas: boolean }) {
  const { usuario, afiliadoId, cargando } = useSesion();
  const listo = fuentesListas && !cargando;

  useEffect(() => {
    if (listo) SplashScreen.hideAsync().catch(() => {});
  }, [listo]);

  // Misma imagen que el splash: en Expo Go (que no muestra el splash propio) se ve igual.
  if (!listo) return <PantallaLogo />;
  const conSesion = !!usuario && !!afiliadoId;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Protected guard={conSesion}>
        <Stack.Screen name="(privado)" />
      </Stack.Protected>
      <Stack.Protected guard={!conSesion}>
        <Stack.Screen name="(publico)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [fuentesCargadas, errorFuentes] = useFonts({
    Fraunces_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });
  // Si las letras fallan, la app sigue con la letra del sistema.
  const fuentesListas = fuentesCargadas || !!errorFuentes;

  return (
    <SafeAreaProvider>
      <SesionProvider>
        <StatusBar style="dark" />
        <Navegacion fuentesListas={fuentesListas} />
      </SesionProvider>
    </SafeAreaProvider>
  );
}
