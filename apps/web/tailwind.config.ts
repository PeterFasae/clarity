
import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1400px'
      }
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))'
        },
        // Clarity brand palette.
        //
        // Contrast rationale, measured on white with the WebAIM formula:
        //   #9b87f5  ~2.9:1  — fails AA for text AND the 3:1 floor for icons,
        //                      borders and focus rings. FILLS AND LARGE DISPLAY
        //                      TYPE ONLY.
        //   #7c69d4  ~4.4:1  — still under the 4.5:1 body-text floor. Removed;
        //                      it was the trap that made the old palette look fixed.
        //   #5F49BC  ~6.7:1  — `ink`. Every purple text, link, icon, border and
        //                      focus ring uses this.
        //   #4B3A96  ~9.0:1  — `dark`, for hover on an ink-filled control.
        lavender: {
          light: '#b8a8f8',
          DEFAULT: '#9b87f5',
          ink: '#5F49BC',
          dark: '#4B3A96',
        },
        bluegray: {
          light: '#a5a8ad',
          DEFAULT: '#8E9196', // ~2.9:1 — decorative fills only
          ink: '#5B6066', // ~5.3:1 — secondary text
          dark: '#484C51',
        },
        softgreen: '#F2FCE2',
        softblue: '#D3E4FD',
        offwhite: '#F6F6F7',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0'
          },
          to: {
            height: 'var(--radix-accordion-content-height)'
          }
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)'
          },
          to: {
            height: '0'
          }
        },
        'pulse-gentle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'pulse-gentle': 'pulse-gentle 2s ease-in-out infinite',
      },
      fontFamily: {
        'dyslexic': ['OpenDyslexic', 'sans-serif'],
        'atkinson': ['Atkinson Hyperlegible', 'sans-serif'],
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      }
    }
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
