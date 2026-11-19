import { Alert, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Aviso, Boton, Cargando, Pantalla, Parrafo, Titulo } from "@/components/ui";
import { cerrarSesion } from "@/auth/cuenta";
import { useAfiliado, type AfiliadoApp } from "@/hooks/useAfiliado";
import { RADIO, colores, espacio, fuentes, texto } from "@/theme";

type Estado = AfiliadoApp["estadoPlan"];

function EstadoChip({ estado }: { estado: Estado }) {
  const { t } = useTranslation();
  const fondo = estado === "activo" ? colores.exitoFondo : estado === "en mora" ? colores.alertaFondo : colores.vino50;
  const color = estado === "activo" ? colores.exito : estado === "en mora" ? colores.alerta : colores.tintaSuave;
  return (
    <View style={[estilos.chip, { backgroundColor: fondo }]}>
      <Text style={[estilos.chipTexto, { color }]}>{t(`estados.${estado}`)}</Text>
    </View>
  );
}

/** Inicio — Fase 1: saludo y estado. La Fase 2 agrega beneficiarios, pagos y contrato. */
export default function Inicio() {
  const { t } = useTranslation();
  const { afiliado, cargando, error } = useAfiliado();

  function confirmarCerrar() {
    Alert.alert(t("inicio.confirmarCerrar"), undefined, [
      { text: t("inicio.no"), style: "cancel" },
      { text: t("inicio.si"), style: "destructive", onPress: () => void cerrarSesion() },
    ]);
  }

  if (cargando) return <Cargando />;

  return (
    <Pantalla>
      {error || !afiliado ? (
        <Aviso>{t("errores.sinAfiliado")}</Aviso>
      ) : (
        <>
          <Titulo>{t("inicio.hola", { nombre: afiliado.nombreCompleto.split(" ")[0] })}</Titulo>
          {!afiliado.soloSeguro && (
            <View style={estilos.tarjeta}>
              <Text style={estilos.tarjetaTitulo}>{t("inicio.plan")}</Text>
              {afiliado.numeroContrato ? <Parrafo suave>{t("inicio.contrato", { numero: afiliado.numeroContrato })}</Parrafo> : null}
              <EstadoChip estado={afiliado.estadoPlan} />
            </View>
          )}
          {afiliado.tieneSeguroVida && afiliado.seguroVida && (
            <View style={estilos.tarjeta}>
              <Text style={estilos.tarjetaTitulo}>{t("inicio.seguro")}</Text>
              <EstadoChip estado={afiliado.seguroVida.estado} />
            </View>
          )}
          <Parrafo suave>{t("inicio.proximamente")}</Parrafo>
        </>
      )}
      <View style={estilos.espaciador} />
      <Boton titulo={t("inicio.cerrarSesion")} variante="secundario" onPress={confirmarCerrar} />
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { backgroundColor: colores.blanco, borderRadius: RADIO, padding: espacio.l, gap: espacio.s, borderWidth: 1, borderColor: colores.borde },
  tarjetaTitulo: { fontFamily: fuentes.titulo, fontSize: texto.grande, color: colores.vino900 },
  chip: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: espacio.m, paddingVertical: espacio.s },
  chipTexto: { fontFamily: fuentes.textoFuerte, fontSize: texto.normal },
  espaciador: { flex: 1 },
});
