import { useEffect, useState, FormEvent } from "react";
import { RouterProvider } from "react-router-dom";
import type { User } from "firebase/auth";
import { alCambiarSesion, iniciarSesion, recuperarContrasena } from "./api/client";
import { router } from "./router";
import { RolProvider } from "./auth/RolContext";

function PantallaLogin() {
  const [modo, setModo] = useState<"login" | "recuperar">("login");
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function manejarLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    const form = new FormData(e.currentTarget);
    try {
      await iniciarSesion(String(form.get("email")), String(form.get("password")));
    } catch {
      setError("Correo o contraseña incorrectos.");
    } finally {
      setCargando(false);
    }
  }

  async function manejarRecuperar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMensaje(null);
    setCargando(true);
    const form = new FormData(e.currentTarget);
    try {
      await recuperarContrasena(String(form.get("email")));
      setMensaje("Listo — si ese correo existe, te llegó un enlace para crear una contraseña nueva. Revisa también spam.");
    } catch {
      // Por seguridad, mostramos el mismo mensaje exista o no la cuenta —
      // así nadie puede usar este formulario para adivinar correos registrados.
      setMensaje("Listo — si ese correo existe, te llegó un enlace para crear una contraseña nueva. Revisa también spam.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-vino-900 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8">
        <div className="mb-4 text-center">
          <h1 className="font-display text-2xl text-vino-900">Los Trinitarios</h1>
          <p className="mt-1 text-sm text-tinta/60">Panel interno del staff</p>
        </div>

        {modo === "login" ? (
          <form onSubmit={manejarLogin} className="space-y-4">
            <input name="email" type="email" required placeholder="Correo" className="w-full rounded-lg border border-vino-100 px-3 py-2.5 text-sm outline-none focus:border-vino-400" />
            <input name="password" type="password" required placeholder="Contraseña" className="w-full rounded-lg border border-vino-100 px-3 py-2.5 text-sm outline-none focus:border-vino-400" />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={cargando} className="w-full rounded-lg bg-vino-700 py-2.5 text-sm font-medium text-white hover:bg-vino-600 disabled:opacity-60">
              {cargando ? "Entrando…" : "Entrar"}
            </button>
            <button
              type="button"
              onClick={() => { setModo("recuperar"); setError(null); setMensaje(null); }}
              className="w-full text-center text-sm text-vino-700 hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </form>
        ) : (
          <form onSubmit={manejarRecuperar} className="space-y-4">
            <p className="text-sm text-tinta/60">Escribe tu correo y te mandamos un enlace para crear una contraseña nueva.</p>
            <input name="email" type="email" required placeholder="Correo" className="w-full rounded-lg border border-vino-100 px-3 py-2.5 text-sm outline-none focus:border-vino-400" />
            {mensaje && <p className="text-sm text-green-700">{mensaje}</p>}
            <button type="submit" disabled={cargando} className="w-full rounded-lg bg-vino-700 py-2.5 text-sm font-medium text-white hover:bg-vino-600 disabled:opacity-60">
              {cargando ? "Enviando…" : "Enviar enlace"}
            </button>
            <button
              type="button"
              onClick={() => { setModo("login"); setError(null); setMensaje(null); }}
              className="w-full text-center text-sm text-vino-700 hover:underline"
            >
              Volver a iniciar sesión
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [usuario, setUsuario] = useState<User | null>(null);
  const [cargandoSesion, setCargandoSesion] = useState(true);

  useEffect(() => {
    return alCambiarSesion((u) => {
      setUsuario(u);
      setCargandoSesion(false);
    });
  }, []);

  if (cargandoSesion) return null;
  if (!usuario) return <PantallaLogin />;

  return (
    <RolProvider user={usuario}>
      <RouterProvider router={router} />
    </RolProvider>
  );
}