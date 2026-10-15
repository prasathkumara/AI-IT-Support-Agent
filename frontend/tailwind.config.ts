import type { Config } from "tailwindcss";

// Tailwind scans the files listed in "content" to decide which CSS classes to
// generate. We point it at our App Router pages and components so unused
// styles are dropped from the final build.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // Design tokens for the AI IT Support look: a primary blue, pale-blue
      // surfaces, and soft card shadows.
      colors: {
        brand: {
          50: "#eff5ff",
          100: "#dbe8fe",
          200: "#bfd6fe",
          300: "#93bbfd",
          400: "#6098fa",
          500: "#3b76f6",
          600: "#2557eb",
          700: "#1d44d8",
          800: "#1e39af",
          900: "#1e358a",
        },
        surface: "#f5f8ff",
        ink: {
          DEFAULT: "#0f1d3a",
          muted: "#55627a",
          subtle: "#8592a8",
        },
      },
      fontFamily: {
        sans: ["Inter", "Segoe UI", "system-ui", "-apple-system", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 29, 58, 0.04), 0 4px 16px rgba(15, 29, 58, 0.05)",
        "card-hover": "0 2px 4px rgba(15, 29, 58, 0.05), 0 12px 28px rgba(37, 87, 235, 0.12)",
      },
      keyframes: {
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "typing-dot": {
          "0%, 80%, 100%": { opacity: "0.25", transform: "translateY(0)" },
          "40%": { opacity: "1", transform: "translateY(-3px)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.25s ease-out both",
        "typing-dot": "typing-dot 1.2s infinite ease-in-out",
      },
    },
  },
  plugins: [],
};

export default config;
