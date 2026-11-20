import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Aviso, Pantalla, Parrafo, Tarjeta, Titulo } from "@/components/ui";
import { ConVista } from "@/components/ConVista";
import { colores, espacio, fuentes, texto } from "@/theme";

/**
 * Beneficios y condiciones del plan del afiliado. Vienen de la vista que arma
 * el backend: los editados en el dashboard (Planes) o, si no, los de la hoja
 * de la empresa. Reemplaza a la pantalla de contrato (la empresa decidió no
 * subir fotos de contratos).
 */
export default function Beneficios() {
  const { t } = useTranslation();
  return (
    <ConVista conEncabezado>
      {(v) => (
        <Pantalla conEncabezado>
          <View style={estilos.cabecera}>
            {v.plan?.nombre ? <Titulo>{t("beneficios.plan", { nombre: v.plan.nombre })}</Titulo> : null}
            {v.numeroContrato ? <Parrafo suave>{t("beneficios.contrato", { numero: v.numeroContrato })}</Parrafo> : null}
          </View>
          {!v.plan || v.plan.beneficios.length === 0 ? (
            <Aviso tipo="info">{t("beneficios.sinInfo")}</Aviso>
          ) : (
            <>
              <Parrafo>{t("beneficios.intro")}</Parrafo>
              <Tarjeta>
                {v.plan.beneficios.map((b, i) => (
                  <View key={`${i}-${b}`} style={[estilos.fila, i > 0 && estilos.separador]}>
                    <Ionicons name="checkmark-circle" size={24} color={colores.exito} style={estilos.icono} />
                    <Text style={estilos.texto}>{b}</Text>
                  </View>
                ))}
              </Tarjeta>
              <Parrafo suave>{t("beneficios.dudas")}</Parrafo>
            </>
          )}
        </Pantalla>
      )}
    </ConVista>
  );
}

const estilos = StyleSheet.create({
  cabecera: { gap: espacio.xs },
  fila: { flexDirection: "row", alignItems: "flex-start", gap: espacio.m, paddingVertical: espacio.s },
  separador: { borderTopWidth: 1, borderTopColor: colores.vino50 },
  icono: { marginTop: 1 },
  texto: { flex: 1, fontFamily: fuentes.texto, fontSize: texto.normal, lineHeight: texto.normal * 1.4, color: colores.tinta },
});
