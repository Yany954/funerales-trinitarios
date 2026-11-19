import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colores, fuentes } from "@/theme";

type Icono = keyof typeof Ionicons.glyphMap;

const PESTANAS: { nombre: string; clave: string; icono: Icono }[] = [
  { nombre: "inicio", clave: "tabs.inicio", icono: "home-outline" },
  { nombre: "beneficiarios", clave: "tabs.beneficiarios", icono: "people-outline" },
  { nombre: "pagos", clave: "tabs.pagos", icono: "receipt-outline" },
  { nombre: "perfil", clave: "tabs.perfil", icono: "person-circle-outline" },
];

export default function LayoutPestanas() {
  const { t } = useTranslation();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colores.vino700,
        tabBarInactiveTintColor: colores.tintaSuave,
        tabBarStyle: { backgroundColor: colores.blanco, borderTopColor: colores.borde, minHeight: 64 },
        tabBarLabelStyle: { fontFamily: fuentes.textoMedio, fontSize: 13 },
      }}
    >
      {PESTANAS.map((p) => (
        <Tabs.Screen
          key={p.nombre}
          name={p.nombre}
          options={{
            title: t(p.clave),
            tabBarIcon: ({ color, size }) => <Ionicons name={p.icono} color={typeof color === "string" ? color : colores.vino700} size={size + 2} />,
          }}
        />
      ))}
    </Tabs>
  );
}
