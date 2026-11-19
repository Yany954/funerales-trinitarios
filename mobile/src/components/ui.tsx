import { useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { ALTO_TOCABLE, RADIO, colores, espacio, fuentes, texto } from "@/theme";

const LOGO = require("../../assets/logo.png");

/**
 * Contenedor de cada pantalla: área segura, scroll y teclado que no tapa los campos.
 * conEncabezado: la pantalla tiene barra de navegación arriba (ella ya deja libre
 * la isla dinámica y la hora); sin encabezado, el margen superior lo pone esta vista.
 */
export function Pantalla({ children, conEncabezado }: { children: ReactNode; conEncabezado?: boolean }) {
  return (
    <SafeAreaView style={estilos.fondo} edges={conEncabezado ? ["bottom", "left", "right"] : ["top", "bottom", "left", "right"]}>
      <KeyboardAvoidingView style={estilos.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/**
 * Logo + "Los Trinitarios" con la misma letra (Fraunces) del dashboard web.
 * "grande" para bienvenida; normal para el encabezado de ingresar/registro.
 */
export function Marca({ grande, subtitulo }: { grande?: boolean; subtitulo?: string }) {
  const { t } = useTranslation();
  return (
    <View style={estilos.marca} accessible accessibilityRole="header" accessibilityLabel={t("comun.empresa")}>
      <Image source={LOGO} style={grande ? estilos.logoGrande : estilos.logo} resizeMode="contain" />
      <Text style={[estilos.marcaNombre, grande && estilos.marcaNombreGrande]}>Los Trinitarios</Text>
      {subtitulo ? <Text style={estilos.marcaSubtitulo}>{subtitulo}</Text> : null}
    </View>
  );
}

/** Pantalla de carga: fondo beige y el logo en el centro (igual al splash). */
export function PantallaLogo() {
  return (
    <View style={[estilos.fondo, estilos.centro]}>
      <Image source={LOGO} style={estilos.logoSplash} resizeMode="contain" accessibilityIgnoresInvertColors />
    </View>
  );
}

export function Titulo({ children }: { children: ReactNode }) {
  return <Text accessibilityRole="header" style={estilos.titulo}>{children}</Text>;
}

export function Parrafo({ children, suave }: { children: ReactNode; suave?: boolean }) {
  return <Text style={[estilos.parrafo, suave && { color: colores.tintaSuave }]}>{children}</Text>;
}

interface BotonProps {
  titulo: string;
  onPress: () => void;
  variante?: "primario" | "secundario" | "texto";
  cargando?: boolean;
  deshabilitado?: boolean;
}

export function Boton({ titulo, onPress, variante = "primario", cargando, deshabilitado }: BotonProps) {
  const inactivo = deshabilitado || cargando;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactivo, busy: !!cargando }}
      disabled={inactivo}
      onPress={onPress}
      style={({ pressed }) => [
        estilos.boton,
        variante === "primario" && estilos.botonPrimario,
        variante === "secundario" && estilos.botonSecundario,
        variante === "texto" && estilos.botonTexto,
        pressed && { opacity: 0.8 },
        inactivo && { opacity: 0.6 },
      ]}
    >
      {cargando ? (
        <ActivityIndicator color={variante === "primario" ? colores.blanco : colores.vino700} />
      ) : (
        <Text style={[estilos.botonLetra, variante === "primario" ? { color: colores.blanco } : { color: colores.vino700 }]}>
          {titulo}
        </Text>
      )}
    </Pressable>
  );
}

interface CampoProps extends TextInputProps {
  etiqueta: string;
  ayuda?: string;
  /** Campo oculto (PIN) con un ojo para mostrar/ocultar lo que se escribe. */
  secreto?: boolean;
}

export function Campo({ etiqueta, ayuda, secreto, style, ...props }: CampoProps) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  return (
    <View style={estilos.campo}>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
      <View style={estilos.inputFila}>
        <TextInput
          accessibilityLabel={etiqueta}
          placeholderTextColor={colores.tintaSuave}
          style={[estilos.input, secreto && estilos.inputConOjo, style]}
          secureTextEntry={secreto && !visible}
          {...props}
        />
        {secreto ? (
          <Pressable
            onPress={() => setVisible((v) => !v)}
            style={estilos.ojo}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={visible ? t("comun.ocultarPin") : t("comun.mostrarPin")}
          >
            <Ionicons name={visible ? "eye-off-outline" : "eye-outline"} size={26} color={colores.vino700} />
          </Pressable>
        ) : null}
      </View>
      {ayuda ? <Text style={estilos.ayuda}>{ayuda}</Text> : null}
    </View>
  );
}

export function Aviso({ tipo = "error", children }: { tipo?: "error" | "info" | "exito"; children: ReactNode }) {
  const fondo = tipo === "error" ? colores.errorFondo : tipo === "exito" ? colores.exitoFondo : colores.vino50;
  const color = tipo === "error" ? colores.error : tipo === "exito" ? colores.exito : colores.tinta;
  return (
    <View accessibilityRole={tipo === "error" ? "alert" : undefined} style={[estilos.aviso, { backgroundColor: fondo }]}>
      <Text style={[estilos.parrafo, { color, marginBottom: 0 }]}>{children}</Text>
    </View>
  );
}

export function Cargando() {
  return (
    <View style={[estilos.fondo, estilos.centro]}>
      <ActivityIndicator size="large" color={colores.vino700} />
    </View>
  );
}

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  fondo: { flex: 1, backgroundColor: colores.crema },
  centro: { alignItems: "center", justifyContent: "center" },
  contenido: { padding: espacio.l, gap: espacio.m, flexGrow: 1 },
  marca: { alignItems: "center", gap: espacio.xs, paddingVertical: espacio.s },
  logo: { width: 72, height: 51 },
  logoGrande: { width: 128, height: 90 },
  logoSplash: { width: 180, height: 126 },
  marcaNombre: { fontFamily: fuentes.marca, fontSize: texto.grande + 2, color: colores.vino900 },
  marcaNombreGrande: { fontSize: 36 },
  marcaSubtitulo: { fontFamily: fuentes.textoMedio, fontSize: texto.normal, color: colores.buganvilla },
  titulo: { fontFamily: fuentes.titulo, fontSize: texto.titulo, color: colores.vino900, marginBottom: espacio.s },
  parrafo: { fontFamily: fuentes.texto, fontSize: texto.normal, lineHeight: texto.normal * 1.4, color: colores.tinta },
  boton: {
    minHeight: ALTO_TOCABLE,
    borderRadius: RADIO,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: espacio.m,
  },
  botonPrimario: { backgroundColor: colores.vino700 },
  botonSecundario: { backgroundColor: colores.blanco, borderWidth: 2, borderColor: colores.vino600 },
  botonTexto: { backgroundColor: "transparent" },
  botonLetra: { fontFamily: fuentes.textoFuerte, fontSize: texto.normal },
  campo: { gap: espacio.xs },
  etiqueta: { fontFamily: fuentes.textoFuerte, fontSize: texto.normal, color: colores.tinta },
  inputFila: { justifyContent: "center" },
  input: {
    minHeight: ALTO_TOCABLE,
    borderRadius: RADIO,
    borderWidth: 2,
    borderColor: colores.borde,
    backgroundColor: colores.blanco,
    paddingHorizontal: espacio.m,
    fontFamily: fuentes.texto,
    fontSize: texto.grande,
    color: colores.tinta,
  },
  inputConOjo: { paddingRight: 56 },
  ojo: { position: "absolute", right: 0, width: 56, height: ALTO_TOCABLE, alignItems: "center", justifyContent: "center" },
  ayuda: { fontFamily: fuentes.texto, fontSize: texto.pequeno, color: colores.tintaSuave },
  aviso: { borderRadius: RADIO, padding: espacio.m },
});
