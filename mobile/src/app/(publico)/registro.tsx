import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Aviso, Boton, Campo, Marca, Pantalla, Parrafo, Titulo } from "@/components/ui";
import { LARGO_PIN, mensajeDeError, normalizarCedula, problemaDelPin, registrarCuenta } from "@/auth/cuenta";
import { TEXTO_HABEAS_DATA, VERSION_HABEAS_DATA } from "@/legal/habeasData";
import { ALTO_TOCABLE, RADIO, colores, espacio, fuentes, texto } from "@/theme";

type Paso = 1 | 2 | 3;
type Metodo = "contrato" | "codigo";

/**
 * Registro en 3 pasos (uno por pantalla para no abrumar):
 * 1) cédula + contrato o código · 2) autorización de datos · 3) crear PIN.
 * Todo se envía junto al final: el backend verifica y crea la cuenta.
 */
export default function Registro() {
  const { t } = useTranslation();
  const [paso, setPaso] = useState<Paso>(1);
  const [cedula, setCedula] = useState("");
  const [metodo, setMetodo] = useState<Metodo>("contrato");
  const [contrato, setContrato] = useState("");
  const [codigo, setCodigo] = useState("");
  const [acepta, setAcepta] = useState(false);
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  function irA(siguiente: Paso) {
    setError(null);
    setPaso(siguiente);
  }

  function validarPaso1() {
    if (normalizarCedula(cedula).length < 5) return setError(t("validacion.cedula"));
    if (metodo === "contrato" && !contrato.trim()) return setError(t("validacion.contrato"));
    if (metodo === "codigo" && normalizarCedula(codigo).length < 6) return setError(t("validacion.codigo"));
    irA(2);
  }

  function validarPaso2() {
    if (!acepta) return setError(t("validacion.habeasData"));
    irA(3);
  }

  async function crearCuenta() {
    setError(null);
    const problema = problemaDelPin(pin);
    if (problema === "largo") return setError(t("validacion.pinLargo"));
    if (problema === "repetido") return setError(t("validacion.pinRepetido"));
    if (problema === "secuencia") return setError(t("validacion.pinSecuencia"));
    if (pin !== pin2) return setError(t("validacion.pinNoCoincide"));
    setEnviando(true);
    try {
      await registrarCuenta({
        cedula,
        numeroContrato: metodo === "contrato" ? contrato : undefined,
        codigoActivacion: metodo === "codigo" ? codigo : undefined,
        pin,
        aceptaHabeasData: acepta,
        versionHabeasData: VERSION_HABEAS_DATA,
      });
      // Al iniciar sesión, el layout raíz lleva a "inicio" solo.
    } catch (err) {
      setError(mensajeDeError(err));
      // Si el problema fue la cédula/contrato/código, hay que corregir el paso 1.
      if ((err as { code?: string })?.code === "functions/failed-precondition") setPaso(1);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Pantalla conEncabezado>
      <Marca subtitulo={t("registro.titulo")} />
      <Text style={estilos.paso}>{t("registro.paso", { actual: paso, total: 3 })}</Text>

      {paso === 1 && (
        <>
          <Parrafo>{t("registro.explicacion")}</Parrafo>
          <Campo etiqueta={t("registro.cedula")} value={cedula} onChangeText={setCedula} keyboardType="number-pad" autoComplete="off" />
          <View style={estilos.selector} accessibilityRole="radiogroup">
            {(["contrato", "codigo"] as const).map((m) => (
              <Pressable
                key={m}
                accessibilityRole="radio"
                accessibilityState={{ checked: metodo === m }}
                onPress={() => setMetodo(m)}
                style={[estilos.opcion, metodo === m && estilos.opcionActiva]}
              >
                <Text style={[estilos.opcionLetra, metodo === m && { color: colores.blanco }]}>
                  {m === "contrato" ? t("registro.tengoContrato") : t("registro.tengoCodigo")}
                </Text>
              </Pressable>
            ))}
          </View>
          {metodo === "contrato" ? (
            <Campo etiqueta={t("registro.numeroContrato")} ayuda={t("registro.ayudaContrato")} value={contrato} onChangeText={setContrato} autoCapitalize="characters" autoComplete="off" />
          ) : (
            <Campo etiqueta={t("registro.codigo")} ayuda={t("registro.ayudaCodigo")} value={codigo} onChangeText={setCodigo} autoCapitalize="characters" autoCorrect={false} autoComplete="off" maxLength={7} />
          )}
          {error && <Aviso>{error}</Aviso>}
          <Boton titulo={t("comun.continuar")} onPress={validarPaso1} />
        </>
      )}

      {paso === 2 && (
        <>
          <Titulo>{t("registro.tituloDatos")}</Titulo>
          <ScrollView style={estilos.legal} nestedScrollEnabled>
            <Text style={estilos.legalTexto}>{TEXTO_HABEAS_DATA}</Text>
          </ScrollView>
          <Pressable style={estilos.aceptar} onPress={() => setAcepta(!acepta)} accessibilityRole="checkbox" accessibilityState={{ checked: acepta }}>
            <Switch value={acepta} onValueChange={setAcepta} trackColor={{ true: colores.vino600 }} accessibilityLabel={t("registro.acepto")} />
            <Text style={estilos.aceptarTexto}>{t("registro.acepto")}</Text>
          </Pressable>
          {error && <Aviso>{error}</Aviso>}
          <Boton titulo={t("comun.continuar")} onPress={validarPaso2} />
          <Boton titulo={t("comun.atras")} variante="texto" onPress={() => irA(1)} />
        </>
      )}

      {paso === 3 && (
        <>
          <Titulo>{t("registro.tituloPin")}</Titulo>
          <Parrafo>{t("registro.explicacionPin")}</Parrafo>
          <Campo etiqueta={t("registro.pin")} value={pin} onChangeText={(v) => setPin(v.replace(/\D/g, ""))} keyboardType="number-pad" secreto maxLength={LARGO_PIN} textContentType="newPassword" />
          <Campo etiqueta={t("registro.confirmarPin")} value={pin2} onChangeText={(v) => setPin2(v.replace(/\D/g, ""))} keyboardType="number-pad" secreto maxLength={LARGO_PIN} textContentType="newPassword" onSubmitEditing={crearCuenta} />
          {error && <Aviso>{error}</Aviso>}
          <Boton titulo={enviando ? t("registro.creando") : t("registro.crear")} onPress={crearCuenta} cargando={enviando} />
          <Boton titulo={t("comun.atras")} variante="texto" onPress={() => irA(2)} deshabilitado={enviando} />
        </>
      )}
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  paso: { fontFamily: fuentes.textoFuerte, fontSize: texto.pequeno, color: colores.buganvilla, textAlign: "center" },
  selector: { gap: espacio.s },
  opcion: {
    minHeight: ALTO_TOCABLE,
    borderRadius: RADIO,
    borderWidth: 2,
    borderColor: colores.vino600,
    justifyContent: "center",
    paddingHorizontal: espacio.m,
    backgroundColor: colores.blanco,
  },
  opcionActiva: { backgroundColor: colores.vino700, borderColor: colores.vino700 },
  opcionLetra: { fontFamily: fuentes.textoFuerte, fontSize: texto.normal, color: colores.vino700 },
  legal: { maxHeight: 340, borderRadius: RADIO, borderWidth: 1, borderColor: colores.borde, backgroundColor: colores.blanco, padding: espacio.m },
  legalTexto: { fontFamily: fuentes.texto, fontSize: texto.pequeno + 1, lineHeight: (texto.pequeno + 1) * 1.45, color: colores.tinta, paddingBottom: espacio.l },
  aceptar: { flexDirection: "row", alignItems: "center", gap: espacio.m, paddingVertical: espacio.s },
  aceptarTexto: { flex: 1, fontFamily: fuentes.texto, fontSize: texto.normal, color: colores.tinta },
});
