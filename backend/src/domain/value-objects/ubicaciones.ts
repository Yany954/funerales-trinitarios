/**
 * Ubicaciones (veredas, corregimientos u otros municipios) que atiende cada sede.
 * Si un afiliado no tiene ubicación elegida, se entiende que es la misma sede.
 */
export const UBICACIONES_POR_SEDE: Record<string, string[]> = {
  Pailitas: ["Las Vegas", "Palestina", "Floresta"],
  Curumaní: ["Sabana Grande", "San Roque"],
  Pelaya: [
    "Floresta",
    "Costilla",
    "San Bernardo",
    "Ayacucho",
    "Simaña",
    "La Sabana",
    "Pueblo Nuevo",
    "Mundo al revés",
    "Las Palmas",
    "Los Naranjos",
    "La Gloria",
    "La Mata",
    "Simaña",
  ],
  Tamalameque: ["Antequera", "Brisas", "Pasacorriendo"],
};
