import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Pantalla, Parrafo, Segmento, Tarjeta, Titulo } from "@/components/ui";
import { ConVista } from "@/components/ConVista";
import { formatoFecha, formatoPeriodo, formatoPesos } from "@/utils/formato";
import type { PagoVista } from "@/vista/tipos";
import { colores, espacio, fuentes, texto } from "@/theme";

function ListaPagos({ pagos }: { pagos: PagoVista[] }) {
  const { t } = useTranslation();
  if (pagos.length === 0) return <Parrafo suave>{t("pagos.ninguno")}</Parrafo>;
  return (
    <>
      {pagos.map((p, i) => (
        <View key={`${p.periodoCubierto}-${i}`} style={[estilos.pago, i === 0 && { borderTopWidth: 0 }]}>
          <View style={estilos.fila}>
            <Text style={estilos.periodo}>{formatoPeriodo(p.periodoCubierto)}</Text>
            <Text style={estilos.valor}>{formatoPesos(p.valor)}</Text>
          </View>
          <Text style={estilos.detalle}>
            {[t("pagos.pagadoEl", { fecha: formatoFecha(p.fecha) }), p.numeroRecibo && t("pagos.recibo", { numero: p.numeroRecibo })].filter(Boolean).join(" · ")}
          </Text>
        </View>
      ))}
      <Text style={estilos.nota}>{t("pagos.ultimos")}</Text>
    </>
  );
}

/** Historial de pagos (plan y/o seguro). Pagar desde la app llega en la Fase 4. */
export default function Pagos() {
  const { t } = useTranslation();
  const [cual, setCual] = useState<"plan" | "seguro">("plan");
  return (
    <ConVista>
      {(v) => {
        const ambos = !!v.plan && !!v.seguroVida;
        const mostrar = ambos ? cual : v.plan ? "plan" : "seguro";
        const pagos = mostrar === "plan" ? v.plan?.pagos ?? [] : v.seguroVida?.pagos ?? [];
        return (
          <Pantalla>
            <Titulo>{t("pagos.titulo")}</Titulo>
            {ambos && (
              <Segmento
                opciones={[{ valor: "plan", etiqueta: t("pagos.plan") }, { valor: "seguro", etiqueta: t("pagos.seguro") }]}
                valor={cual}
                onCambiar={setCual}
              />
            )}
            <Tarjeta titulo={mostrar === "plan" ? t("plan.titulo") : t("seguro.titulo")}>
              <ListaPagos pagos={pagos} />
            </Tarjeta>
          </Pantalla>
        );
      }}
    </ConVista>
  );
}

const estilos = StyleSheet.create({
  pago: { paddingVertical: espacio.m, borderTopWidth: 1, borderTopColor: colores.vino50, gap: espacio.xs },
  fila: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: espacio.s },
  periodo: { fontFamily: fuentes.textoFuerte, fontSize: texto.normal + 1, color: colores.tinta, textTransform: "capitalize", flexShrink: 1 },
  valor: { fontFamily: fuentes.textoFuerte, fontSize: texto.normal + 1, color: colores.vino900 },
  detalle: { fontFamily: fuentes.texto, fontSize: texto.pequeno + 1, color: colores.tintaSuave },
  nota: { fontFamily: fuentes.texto, fontSize: texto.pequeno, color: colores.tintaSuave, marginTop: espacio.s },
});
