import { Navigate } from "react-router-dom";
import { useRol } from "../auth/RolContext";

export default function RutaSoloAdmin({ children }: { children: React.ReactNode }) {
  const { rol, cargando } = useRol();
  if (cargando) return null;
  if (rol !== "admin") return <Navigate to="/" replace />;
  return <>{children}</>;
}