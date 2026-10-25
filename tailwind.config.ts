import type { Config } from "tailwindcss";

// Storybook Stickers palette (public/lab/fantasy-stickers/notes.json). Text pairs are >= 5:1 on the paper.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: { DEFAULT: "#f8f0de", ground: "#eadfc7", deep: "#ddcfb2", cut: "#fffaf0" },
        ink: { DEFAULT: "#2e2421", soft: "#5b4a3b" },
        gold: { DEFAULT: "#dbb35e", light: "#f2db94", deep: "#8e6a2f", text: "#75561f" },
        blue: { DEFAULT: "#a3c3d8", light: "#d2e3ec", deep: "#56789a" },
        night: "#263a55",
        glass: "#e4edf1",
        sage: { DEFAULT: "#a8bc8b", deep: "#4f5e2c" },
        rasp: { DEFAULT: "#c04f66", deep: "#963248" },
        burg: "#6e2338",
      },
      fontFamily: {
        display: ["var(--font-display)", "Iowan Old Style", "Georgia", "serif"],
        sans: ["var(--font-ui)", "Avenir Next", "system-ui", "sans-serif"],
      },
      transitionTimingFunction: {
        "out-quint": "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      zIndex: {
        sticky: "10",
        drawer: "40",
        toast: "50",
      },
      keyframes: {
        bob: {
          "0%, 100%": { transform: "translateY(0) rotate(-2deg)" },
          "50%": { transform: "translateY(-8px) rotate(2deg)" },
        },
        twinkle: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: ".55", transform: "scale(.82)" },
        },
      },
      animation: {
        bob: "bob 3.2s ease-in-out infinite",
        twinkle: "twinkle 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
