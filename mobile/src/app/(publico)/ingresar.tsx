import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Aviso, Boton, Campo, Marca, Pantalla, Parrafo } from "@/components/ui";
import { LARGO_PIN, iniciarSesion, mensajeDeError, normalizarCedula } from "@/auth/cuenta";

export default function Ingresar() {
  const { t } = useTranslation();
  const [cedula, setCedula] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function manejarIngresar() {
    setError(null);
    if (normalizarCedula(cedula).length < 5) return setError(t("validacion.cedula"));
    if (pin.length !== LARGO_PIN) return setError(t("validacion.pinLargo"));
    setEnviando(true);
    try {
      await iniciarSesion(cedula, pin);
      // Al cambiar la sesión, el layout raíz lleva a "inicio" solo.
    } catch (err) {
      setError(mensajeDeError(err));
      setPin("");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Pantalla conEncabezado>
      <Marca />
      <Campo
        etiqueta={t("ingresar.cedula")}
        value={cedula}
        onChangeText={setCedula}
        keyboardType="number-pad"
        autoComplete="off"
        textContentType="username"
        returnKeyType="next"
      />
      <Campo
        etiqueta={t("ingresar.pin")}
        value={pin}
        onChangeText={(v) => setPin(v.replace(/\D/g, ""))}
        keyboardType="number-pad"
        secreto
        maxLength={LARGO_PIN}
        textContentType="password"
        onSubmitEditing={manejarIngresar}
      />
      {error && <Aviso>{error}</Aviso>}
      <Boton titulo={t("ingresar.boton")} onPress={manejarIngresar} cargando={enviando} />
      <Parrafo suave>{t("ingresar.olvidePin")}</Parrafo>
    </Pantalla>
  );
}
