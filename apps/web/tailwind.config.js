/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        editorial: ['"Cormorant Garamond"', 'Georgia', 'serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        glam: {
          champagne: "#FDF7E7",
          gold: "#D4AF37",
          amber: "#B89028",
          bronze: "#856214",
          velvet: "#14121A",
          noir: "#09090B",
          obsidian: "#0D0B10",
          card: "#121118",
          surface: "#181620",
          ruby: "#E11D48",
          silk: "#1A1722",
          pearl: "#201C2B",
        },
      },
      boxShadow: {
        'glam-sm': '0 4px 14px 0 rgba(212, 175, 55, 0.12)',
        'glam': '0 10px 30px -5px rgba(212, 175, 55, 0.25), 0 8px 15px -6px rgba(0, 0, 0, 0.8)',
        'glam-gold': '0 10px 30px -5px rgba(212, 175, 55, 0.35), 0 0 15px rgba(212, 175, 55, 0.2)',
        'glam-lg': '0 25px 60px -10px rgba(0, 0, 0, 0.9)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.5)',
        'glass-card': '0 20px 45px -10px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
    },
  },
  plugins: [],
}
