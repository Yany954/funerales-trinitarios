import { createBrowserRouter } from "react-router-dom";
import DashboardLayout from "./layouts/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Afiliados from "./pages/Afiliados";
import Servicios from "./pages/Servicios";
import Convenios from "./pages/Convenios";
import Cofres from "./pages/Cofres";
import Inventario from "./pages/Inventario";
import Bovedas from "./pages/Bovedas";
import Flores from "./pages/Flores";
import Planes from "./pages/Planes";
import Reportes from "./pages/Reportes";
import RutaSoloAdmin from "./components/RutaSoloAdmin";
import Usuarios from "./pages/Usuarios";
import Facturacion from "./pages/Facturacion";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <DashboardLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "afiliados", element: <Afiliados /> },
      { path: "servicios", element: <RutaSoloAdmin><Servicios /></RutaSoloAdmin> },
      { path: "convenios", element:<RutaSoloAdmin><Convenios /></RutaSoloAdmin> },
      { path: "inventario", element: <RutaSoloAdmin><Inventario /></RutaSoloAdmin> },
      { path: "bovedas", element: <Bovedas /> },
      { path: "flores", element: <RutaSoloAdmin><Flores /></RutaSoloAdmin> },
      { path: "reportes", element: <Reportes /> },
      { path: "cofres", element: <RutaSoloAdmin><Cofres /></RutaSoloAdmin> },
      { path: "planes", element: <RutaSoloAdmin><Planes /></RutaSoloAdmin> },
      { path: "usuarios", element: <RutaSoloAdmin><Usuarios /></RutaSoloAdmin> },
      { path: "facturacion", element: <Facturacion /> },
    ],
  },
]);