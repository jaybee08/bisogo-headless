import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";
import lineClamp from "@tailwindcss/line-clamp";

export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      borderRadius: { lg: "var(--radius)" },
      colors: {
        background: "rgb(var(--bg))",
        foreground: "rgb(var(--fg))",
        muted: "rgb(var(--muted))",
        border: "rgb(var(--border))",
        ring: "rgb(var(--ring))",
      },
      boxShadow: {
        soft: "var(--shadow)",
      },
    },
  },
  plugins: [typography, lineClamp]
} satisfies Config;
