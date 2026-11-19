import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Aviso, Chip, Pantalla, Parrafo, Tarjeta, Titulo } from "@/components/ui";
import { ConVista } from "@/components/ConVista";
import { formatoFecha } from "@/utils/formato";
import type { BeneficiarioVista } from "@/vista/tipos";
import { RADIO, colores, espacio, fuentes, texto } from "@/theme";

function BarraCupo({ usados, limite }: { usados: number; limite: number }) {
  const proporcion = Math.min(1, limite > 0 ? usados / limite : 0);
  return (
    <View style={estilos.barra} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: limite, now: usados }}>
      <View style={[estilos.barraLlena, { width: `${proporcion * 100}%` }]} />
    </View>
  );
}

function FilaBeneficiario({ b }: { b: BeneficiarioVista }) {
  const { t } = useTranslation();
  const tono = b.estado === "activo" ? "exito" : "neutro";
  return (
    <View style={estilos.beneficiario}>
      <View style={estilos.cabeceraBenef}>
        <Text style={[estilos.nombre, b.estado !== "activo" && { color: colores.tintaSuave }]}>{b.nombre}</Text>
        <Chip texto={t(`beneficiarios.estado.${b.estado}`)} tono={tono} />
      </View>
      <Text style={estilos.detalle}>
        {[b.parentesco, b.cedulaParcial && t("beneficiarios.cedula", { cedula: b.cedulaParcial })].filter(Boolean).join(" · ")}
      </Text>
      {b.fechaAdicion ? <Text style={estilos.detalle}>{t("beneficiarios.desde", { fecha: formatoFecha(b.fechaAdicion) })}</Text> : null}
      {b.adicional ? <Chip texto={t("beneficiarios.adicional")} tono="vino" /> : null}
    </View>
  );
}

/** Solo lectura en esta fase: los cambios se piden en la sede (Fase 3: desde la app). */
export default function Beneficiarios() {
  const { t } = useTranslation();
  return (
    <ConVista>
      {(v) => (
        <Pantalla>
          <Titulo>{t("beneficiarios.titulo")}</Titulo>

          {v.plan && (
            <Tarjeta titulo={t("plan.titulo")}>
              <Text style={estilos.cupo}>{t("beneficiarios.cupo", v.plan.cupo)}</Text>
              <BarraCupo usados={v.plan.cupo.usados} limite={v.plan.cupo.limite} />
              {v.plan.beneficiarios.length === 0 ? (
                <Parrafo suave>{t("beneficiarios.ninguno")}</Parrafo>
              ) : (
                v.plan.beneficiarios.map((b, i) => <FilaBeneficiario key={`${b.nombre}-${i}`} b={b} />)
              )}
            </Tarjeta>
          )}

          {v.seguroVida && v.seguroVida.beneficiarios.length > 0 && (
            <Tarjeta titulo={t("seguro.beneficiarios")}>
              {v.seguroVida.beneficiarios.map((b, i) => (
                <View key={`${b.nombre}-${i}`} style={estilos.beneficiario}>
                  <View style={estilos.cabeceraBenef}>
                    <Text style={estilos.nombre}>{b.nombre}</Text>
                    <Chip texto={t("seguro.porcentaje", { porcentaje: b.porcentaje })} tono="vino" />
                  </View>
                  <Text style={estilos.detalle}>{b.parentesco}</Text>
                </View>
              ))}
            </Tarjeta>
          )}

          <Aviso tipo="info">{t("beneficiarios.cambios")}</Aviso>
        </Pantalla>
      )}
    </ConVista>
  );
}

const estilos = StyleSheet.create({
  cupo: { fontFamily: fuentes.textoFuerte, fontSize: texto.normal, color: colores.tinta },
  barra: { height: 12, borderRadius: RADIO, backgroundColor: colores.vino50, overflow: "hidden", marginBottom: espacio.s },
  barraLlena: { height: "100%", backgroundColor: colores.buganvilla, borderRadius: RADIO },
  beneficiario: { gap: espacio.xs, paddingVertical: espacio.m, borderTopWidth: 1, borderTopColor: colores.vino50 },
  cabeceraBenef: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: espacio.s, flexWrap: "wrap" },
  nombre: { fontFamily: fuentes.textoFuerte, fontSize: texto.normal + 1, color: colores.tinta, flexShrink: 1 },
  detalle: { fontFamily: fuentes.texto, fontSize: texto.pequeno + 1, color: colores.tintaSuave },
});
