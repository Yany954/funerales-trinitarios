import { Redirect } from "expo-router";
import { useSesion } from "@/auth/SesionContext";

/** Punto de entrada: manda a inicio o a bienvenida según haya sesión. */
export default function Index() {
  const { usuario, afiliadoId } = useSesion();
  return <Redirect href={usuario && afiliadoId ? "/inicio" : "/bienvenida"} />;
}
