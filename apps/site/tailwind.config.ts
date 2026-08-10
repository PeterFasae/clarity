import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    // Cap the reading measure — long lines are a documented barrier for this audience.
    container: {
      center: true,
      padding: "1.5rem",
    },
    extend: {
      colors: {
        // Semantic tokens (theme-aware, driven by CSS variables in index.css)
        bg: "hsl(var(--bg))",
        surface: "hsl(var(--surface))",
        ink: "hsl(var(--ink))",
        "ink-muted": "hsl(var(--ink-muted))",
        line: "hsl(var(--line))",

        // Brand palette (fixed hues; see index.css for the AA rationale)
        lavender: {
          DEFAULT: "#9b87f5", // fills / large display type only — ~2.9:1 on white, NOT body text
          ink: "#5F49BC", // all purple text + links — ~6.7:1 on white
          soft: "hsl(var(--lavender-soft))",
        },
        softblue: "hsl(var(--softblue))",
        softgreen: "hsl(var(--softgreen))",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      fontSize: {
        // Base is 18px (1.125rem); everything scales from there.
        sm: ["0.9375rem", { lineHeight: "1.6" }], // 15
        base: ["1.125rem", { lineHeight: "1.7" }], // 18
        lg: ["1.3125rem", { lineHeight: "1.6" }], // 21
        xl: ["1.5rem", { lineHeight: "1.5" }], // 24
        "2xl": ["1.875rem", { lineHeight: "1.35" }], // 30
        "3xl": ["2.375rem", { lineHeight: "1.2" }], // 38
        "4xl": ["3rem", { lineHeight: "1.1" }], // 48
        "5xl": ["3.75rem", { lineHeight: "1.05" }], // 60
      },
      maxWidth: {
        measure: "65ch",
        content: "72rem",
      },
      borderRadius: {
        lg: "0.75rem",
        md: "calc(0.75rem - 2px)",
        sm: "calc(0.75rem - 4px)",
      },
      keyframes: {
        "fade-rise": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-gentle": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
      },
      animation: {
        "fade-rise": "fade-rise 0.3s ease-out both",
        "pulse-gentle": "pulse-gentle 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
