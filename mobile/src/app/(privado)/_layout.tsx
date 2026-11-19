import { Stack } from "expo-router";
import { colores } from "@/theme";

export default function LayoutPrivado() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colores.crema } }} />;
}
