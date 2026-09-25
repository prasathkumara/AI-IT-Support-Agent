// PostCSS runs Tailwind (to generate utility classes) and Autoprefixer (to add
// vendor prefixes for older browsers) whenever Next.js processes CSS.
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

export default config;
