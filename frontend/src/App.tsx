import { useEffect, useState, FormEvent } from "react";
import { RouterProvider } from "react-router-dom";
import type { User } from "firebase/auth";
import { alCambiarSesion, iniciarSesion } from "./api/client";
import { router } from "./router";

function PantallaLogin() {
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function manejarEnvio(e: FormEvent<HTMLFormElement>) {
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-vino-900 px-4">
      <form onSubmit={manejarEnvio} className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-8">
        <div className="text-center">
          <h1 className="font-display text-2xl text-vino-900">Los Trinitarios</h1>
          <p className="mt-1 text-sm text-tinta/60">Panel interno del staff</p>
        </div>
        <input
          name="email"
          type="email"
          required
          placeholder="Correo"
          className="w-full rounded-lg border border-vino-100 px-3 py-2.5 text-sm outline-none focus:border-vino-400"
        />
        <input
          name="password"
          type="password"
          required
          placeholder="Contraseña"
          className="w-full rounded-lg border border-vino-100 px-3 py-2.5 text-sm outline-none focus:border-vino-400"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={cargando}
          className="w-full rounded-lg bg-vino-700 py-2.5 text-sm font-medium text-white hover:bg-vino-600 disabled:opacity-60"
        >
          {cargando ? "Entrando…" : "Entrar"}
        </button>
      </form>
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

  if (cargandoSesion) return null; // evita el parpadeo de la pantalla de login
  if (!usuario) return <PantallaLogin />;

  return <RouterProvider router={router} />;
}
