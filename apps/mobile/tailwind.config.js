/** @type {import('tailwindcss').Config} */
const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
// Backgrounds, cards, chips, borders and muted text all use the zinc scale.
// Here it reads from CSS variables, so the Background setting can restyle the whole app.
const zinc = Object.fromEntries(steps.map((s) => [s, `rgb(var(--z-${s}) / <alpha-value>)`]));

module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        accent: "rgb(var(--accent) / <alpha-value>)",
        "on-accent": "rgb(var(--on-accent) / <alpha-value>)",
        zinc,
      },
    },
  },
  plugins: [],
};
