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

export const router = createBrowserRouter([
  {
    path: "/",
    element: <DashboardLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "afiliados", element: <Afiliados /> },
      { path: "servicios", element: <Servicios /> },
      { path: "convenios", element: <Convenios /> },
      { path: "cofres", element: <Cofres /> },
      { path: "inventario", element: <Inventario /> },
      { path: "bovedas", element: <Bovedas /> },
      { path: "flores", element: <Flores /> },
      { path: "planes", element: <Planes /> },
      { path: "reportes", element: <Reportes /> },
    ],
  },
]);
