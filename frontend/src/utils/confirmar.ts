import Swal from "sweetalert2";

export async function confirmarEliminar(nombre: string): Promise<boolean> {
  const resultado = await Swal.fire({
    title: "¿Eliminar?",
    text: `Esto va a borrar "${nombre}" del catálogo. Esta acción no se puede deshacer.`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sí, eliminar",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#5E2138",
    cancelButtonColor: "#9CA3AF",
  });
  return resultado.isConfirmed;
}
export async function confirmarAccion(titulo: string, texto: string, textoBoton = "Sí, continuar"): Promise<boolean> {
  const r = await Swal.fire({
    title: titulo,
    text: texto,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: textoBoton,
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#5E2138",
    cancelButtonColor: "#9CA3AF",
  });
  return r.isConfirmed;
}