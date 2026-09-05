/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Paleta tomada del logo de Funerales Los Trinitarios (buganvilla) —
        // un vino profundo en vez del azul genérico de dashboard.
        vino: {
          50: "#FBF2F5",
          100: "#F3DEE6",
          400: "#B14E72",
          600: "#7A2C48",
          700: "#5E2138",
          900: "#3A1423",
        },
        crema: "#FAF6F1",
        tinta: "#2B2530",
        buganvilla: "#C2478A",
      },
      fontFamily: {
        display: ["Fraunces", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
