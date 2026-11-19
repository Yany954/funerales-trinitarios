import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";
import es from "./es";
import en from "./en";

/** Español por defecto; inglés si el celular está en inglés. */
const idiomaCelular = getLocales()[0]?.languageCode ?? "es";

i18n.use(initReactI18next).init({
  resources: { es: { translation: es }, en: { translation: en } },
  lng: idiomaCelular === "en" ? "en" : "es",
  fallbackLng: "es",
  interpolation: { escapeValue: false }, // React ya escapa el texto
});

export default i18n;
