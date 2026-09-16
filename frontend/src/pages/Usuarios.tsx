import { useEffect, useState, FormEvent } from "react";
import { UserPlus, Copy, Check, Ban, RotateCcw } from "lucide-react";
import { listarUsuarios, crearUsuario, asignarRol, generarEnlaceInvitacion, cambiarEstadoUsuario } from "../api/client";
import DataTable from "../components/DataTable";
import type { UsuarioListado } from "../types";

const SEDES = ["Pailitas", "Tamalameque", "Pelaya", "Curumaní"] as const;

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<UsuarioListado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enlaceGenerado, setEnlaceGenerado] = useState<{ email: string; enlace: string } | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [rolNuevo, setRolNuevo] = useState<"admin" | "empleado">("empleado");

  async function cargar() {
    setCargando(true);
    try {
      setUsuarios(await listarUsuarios());
    } catch (err) {
      console.error("Error cargando usuarios:", err);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  async function manejarCrear(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    const form = new FormData(e.currentTarget);
    try {
      const email = String(form.get("email"));
      const resultado = await crearUsuario({
        nombre: String(form.get("nombre")),
        email,
        rol: rolNuevo,
        sede: String(form.get("sede") || ""),
      });
      setEnlaceGenerado({ email, enlace: resultado.enlaceInvitacion });
      setMostrarFormulario(false);
      (e.target as HTMLFormElement).reset();
      cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el usuario.");
    } finally {
      setGuardando(false);
    }
  }

  async function manejarCambiarRolSede(u: UsuarioListado, rol: "admin" | "empleado", sede: string) {
    await asignarRol(u.uid, rol, sede);
    cargar();
  }

  async function manejarReenviarEnlace(email: string) {
    const enlace = await generarEnlaceInvitacion(email);
    setEnlaceGenerado({ email, enlace });
  }

  async function manejarToggleEstado(u: UsuarioListado) {
    await cambiarEstadoUsuario(u.uid, !u.deshabilitado);
    cargar();
  }

  function copiarEnlace() {
    if (!enlaceGenerado) return;
    navigator.clipboard.writeText(enlaceGenerado.enlace);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg text-vino-900">Usuarios</h2>
        <button onClick={() => setMostrarFormulario((v) => !v)} className="flex items-center gap-2 rounded-lg bg-buganvilla px-4 py-2.5 text-sm font-medium text-white hover:opacity-90">
          <UserPlus size={16} /> Nuevo usuario
        </button>
      </div>

      {enlaceGenerado && (
        <div className="space-y-2 rounded-xl border border-vino-100 bg-vino-50 p-4">
          <p className="text-sm font-medium text-vino-900">Enlace de invitación para {enlaceGenerado.email}</p>
          <p className="text-xs text-tinta/60">
            Cópialo y envíaselo por WhatsApp — al abrirlo, la persona crea su propia contraseña. El enlace vence en 1 hora.
          </p>
          <div className="flex gap-2">
            <input readOnly value={enlaceGenerado.enlace} className="flex-1 rounded-lg border border-vino-100 bg-white px-3 py-2 text-xs" />
            <button onClick={copiarEnlace} className="flex items-center gap-1.5 rounded-lg bg-vino-700 px-3 py-2 text-sm text-white">
              {copiado ? <Check size={14} /> : <Copy size={14} />}
              {copiado ? "Copiado" : "Copiar"}
            </button>
          </div>
          <button onClick={() => setEnlaceGenerado(null)} className="text-xs text-tinta/50 hover:underline">Cerrar</button>
        </div>
      )}

      {mostrarFormulario && (
        <form onSubmit={manejarCrear} className="space-y-3 rounded-xl border border-vino-100 bg-white p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <input name="nombre" required placeholder="Nombre completo" className="rounded-lg border border-vino-100 px-3 py-2 text-sm" />
            <input name="email" type="email" required placeholder="Correo" className="rounded-lg border border-vino-100 px-3 py-2 text-sm" />
            <select value={rolNuevo} onChange={(e) => setRolNuevo(e.target.value as "admin" | "empleado")} className="rounded-lg border border-vino-100 px-3 py-2 text-sm">
              <option value="empleado">Empleado</option>
              <option value="admin">Administrador</option>
            </select>
            {rolNuevo === "empleado" && (
              <select name="sede" required className="rounded-lg border border-vino-100 px-3 py-2 text-sm">
                <option value="">Sede…</option>
                {SEDES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={guardando} className="rounded-lg bg-vino-700 px-4 py-2 text-sm font-medium text-white hover:bg-vino-600 disabled:opacity-60">
            {guardando ? "Creando…" : "Crear usuario y generar enlace"}
          </button>
        </form>
      )}

      <DataTable
        columnas={[
          { encabezado: "Nombre", render: (u: UsuarioListado) => u.nombre },
          { encabezado: "Correo", render: (u: UsuarioListado) => u.email },
          {
            encabezado: "Rol",
            render: (u: UsuarioListado) => (
              <select
                defaultValue={u.rol}
                onChange={(e) => manejarCambiarRolSede(u, e.target.value as "admin" | "empleado", u.sede === "all" ? "Pailitas" : u.sede)}
                className="rounded-md border border-vino-100 px-2 py-1 text-xs"
              >
                <option value="empleado">Empleado</option>
                <option value="admin">Administrador</option>
              </select>
            ),
          },
          {
            encabezado: "Sede",
            render: (u: UsuarioListado) =>
              u.rol === "admin" ? (
                <span className="text-xs text-tinta/50">Todas</span>
              ) : (
                <select
                  defaultValue={u.sede}
                  onChange={(e) => manejarCambiarRolSede(u, "empleado", e.target.value)}
                  className="rounded-md border border-vino-100 px-2 py-1 text-xs"
                >
                  {SEDES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              ),
          },
          {
            encabezado: "Estado",
            render: (u: UsuarioListado) => (
              <span className={`rounded-full px-2 py-1 text-xs ${u.deshabilitado ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
                {u.deshabilitado ? "Deshabilitado" : "Activo"}
              </span>
            ),
          },
          {
            encabezado: "Acciones",
            render: (u: UsuarioListado) => (
              <div className="flex gap-2">
                <button onClick={() => manejarReenviarEnlace(u.email)} title="Reenviar enlace" className="text-vino-700 hover:underline">
                  <RotateCcw size={14} />
                </button>
                <button onClick={() => manejarToggleEstado(u)} title={u.deshabilitado ? "Habilitar" : "Deshabilitar"} className="text-tinta/50 hover:text-red-600">
                  <Ban size={14} />
                </button>
              </div>
            ),
          },
        ]}
        filas={usuarios}
        cargando={cargando}
        claveFila={(u) => u.uid}
        vacioTitulo="Todavía no hay usuarios del staff"
        vacioDescripcion='Usa "Nuevo usuario" para invitar al primero.'
      />
    </div>
  );
}