import { useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Aviso, Boton, Campo, FilaDato, Pantalla, Parrafo, Tarjeta, Titulo } from "@/components/ui";
import { ConVista } from "@/components/ConVista";
import { cerrarSesion, mensajeDeError } from "@/auth/cuenta";
import { guardarCelular, subirFotoPerfil } from "@/auth/perfil";
import { useSesion } from "@/auth/SesionContext";
import { calcularEdad, formatoFecha } from "@/utils/formato";
import type { VistaAfiliado } from "@/vista/tipos";
import { colores, espacio, fuentes, texto } from "@/theme";

function FotoPerfil({ vista }: { vista: VistaAfiliado }) {
  const { t } = useTranslation();
  const { afiliadoId } = useSesion();
  const [subiendo, setSubiendo] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "exito" | "error"; texto: string } | null>(null);

  async function elegirFoto() {
    setMensaje(null);
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) return setMensaje({ tipo: "error", texto: t("perfil.permisoFotos") });
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.6 });
    if (r.canceled || !r.assets[0] || !afiliadoId) return;
    setSubiendo(true);
    try {
      await subirFotoPerfil(afiliadoId, r.assets[0].uri, r.assets[0].mimeType ?? "image/jpeg");
      setMensaje({ tipo: "exito", texto: t("perfil.fotoGuardada") });
    } catch (err) {
      setMensaje({ tipo: "error", texto: mensajeDeError(err) });
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <View style={estilos.fotoZona}>
      <Pressable onPress={elegirFoto} disabled={subiendo} accessibilityRole="button" accessibilityLabel={vista.fotoPerfilURL ? t("perfil.cambiarFoto") : t("perfil.agregarFoto")}>
        {vista.fotoPerfilURL ? (
          <Image source={{ uri: vista.fotoPerfilURL }} style={estilos.foto} />
        ) : (
          <View style={[estilos.foto, estilos.fotoVacia]}>
            <Ionicons name="person" size={56} color={colores.vino400} />
          </View>
        )}
        <View style={estilos.camara}>
          <Ionicons name="camera" size={20} color={colores.blanco} />
        </View>
      </Pressable>
      <Text style={estilos.nombre}>{vista.nombreCompleto}</Text>
      <Text style={estilos.accionFoto}>{subiendo ? t("perfil.subiendoFoto") : vista.fotoPerfilURL ? t("perfil.cambiarFoto") : t("perfil.agregarFoto")}</Text>
      {mensaje && <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso>}
    </View>
  );
}

function FormularioCelular({ inicial }: { inicial: string }) {
  const { t } = useTranslation();
  const [celular, setCelular] = useState(inicial);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "exito" | "error"; texto: string } | null>(null);

  async function guardar() {
    setMensaje(null);
    setGuardando(true);
    try {
      await guardarCelular(celular);
      setMensaje({ tipo: "exito", texto: t("perfil.guardado") });
    } catch (err) {
      setMensaje({ tipo: "error", texto: mensajeDeError(err) });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      <Campo etiqueta={t("perfil.celular")} ayuda={t("perfil.celularAyuda")} value={celular} onChangeText={setCelular} keyboardType="phone-pad" textContentType="telephoneNumber" autoComplete="tel" placeholder="300 123 4567" />
      {mensaje && <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso>}
      <Boton titulo={t("perfil.guardar")} onPress={guardar} cargando={guardando} deshabilitado={celular.trim() === inicial} />
    </>
  );
}

/** Perfil: lo único editable es la foto y el celular; el resto se corrige en la sede. */
export default function Perfil() {
  const { t } = useTranslation();

  function confirmarCerrar() {
    Alert.alert(t("inicio.confirmarCerrar"), undefined, [
      { text: t("inicio.no"), style: "cancel" },
      { text: t("inicio.si"), style: "destructive", onPress: () => void cerrarSesion() },
    ]);
  }

  return (
    <ConVista>
      {(v) => {
        const edad = calcularEdad(v.fechaNacimiento);
        return (
          <Pantalla>
            <Titulo>{t("perfil.titulo")}</Titulo>
            <FotoPerfil vista={v} />
            <Tarjeta>
              <FilaDato etiqueta={t("perfil.cedula")} valor={v.cedulaParcial || "—"} />
              {v.numeroContrato ? <FilaDato etiqueta={t("perfil.contrato")} valor={v.numeroContrato} /> : null}
              <FilaDato etiqueta={t("perfil.afiliadoDesde")} valor={formatoFecha(v.fechaAfiliacion)} />
              {edad !== null && <FilaDato etiqueta={t("perfil.edad")} valor={t("perfil.anios", { edad })} />}
              <FilaDato etiqueta={t("perfil.sede")} valor={v.sede} />
              {v.ubicacion && v.ubicacion !== v.sede ? <FilaDato etiqueta={t("perfil.ubicacion")} valor={v.ubicacion} /> : null}
              <Parrafo suave>{t("perfil.soloLectura")}</Parrafo>
            </Tarjeta>
            <Tarjeta>
              <FormularioCelular key={v.celular ?? ""} inicial={v.celular ?? ""} />
            </Tarjeta>
            {v.plan && <Boton titulo={t("plan.verContrato")} variante="secundario" onPress={() => router.push("/contrato")} />}
            <Boton titulo={t("inicio.cerrarSesion")} variante="peligro" icono="log-out-outline" onPress={confirmarCerrar} />
          </Pantalla>
        );
      }}
    </ConVista>
  );
}

const estilos = StyleSheet.create({
  fotoZona: { alignItems: "center", gap: espacio.s },
  foto: { width: 120, height: 120, borderRadius: 60, backgroundColor: colores.vino50 },
  fotoVacia: { alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colores.vino100 },
  camara: { position: "absolute", right: 0, bottom: 0, width: 38, height: 38, borderRadius: 19, backgroundColor: colores.vino700, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: colores.crema },
  nombre: { fontFamily: fuentes.titulo, fontSize: texto.grande, color: colores.vino900, textAlign: "center" },
  accionFoto: { fontFamily: fuentes.textoMedio, fontSize: texto.pequeno + 1, color: colores.buganvilla },
});
