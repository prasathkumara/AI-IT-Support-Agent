import type { Config } from "tailwindcss";

// Tailwind scans the files listed in "content" to decide which CSS classes to
// generate. We point it at our App Router pages and future components so unused
// styles are dropped from the final build.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
