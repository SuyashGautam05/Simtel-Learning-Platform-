/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#173681",
          50: "#eef1fb",
          100: "#d6ddf5",
          200: "#adbaeb",
          300: "#8497e0",
          400: "#4f61b9",
          500: "#2a409a",
          600: "#1e327f",
          700: "#173681",
          800: "#122868",
          900: "#0d1c4a",
          950: "#080f2e",
        },
        gold: {
          DEFAULT: "#e1ac3d",
          50: "#fdf8ee",
          100: "#faedd0",
          200: "#f4d99e",
          300: "#edc16a",
          400: "#e1ac3d",
          500: "#d3962a",
          600: "#b57620",
          700: "#8f591d",
          800: "#74471e",
          900: "#623c1e",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: 0, transform: "translateY(6px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        "fade-in-scale": {
          "0%": { opacity: 0, transform: "scale(0.97)" },
          "100%": { opacity: 1, transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-500px 0" },
          "100%": { backgroundPosition: "500px 0" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(225,172,61,0.35)" },
          "50%": { boxShadow: "0 0 0 8px rgba(225,172,61,0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out both",
        "fade-in-scale": "fade-in-scale 0.35s ease-out both",
        shimmer: "shimmer 2s linear infinite",
        "pulse-glow": "pulse-glow 2.2s ease-in-out infinite",
        float: "float 4s ease-in-out infinite",
      },
      boxShadow: {
        card: "0 1px 2px rgba(23,54,129,0.06), 0 8px 24px -8px rgba(23,54,129,0.12)",
        "card-hover": "0 4px 8px rgba(23,54,129,0.08), 0 16px 32px -12px rgba(23,54,129,0.18)",
      },
    },
  },
  plugins: [],
};
