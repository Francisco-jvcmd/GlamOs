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
          champagne: "#FFF6D6",
          gold: "#F6D365",
          amber: "#D97706",
          bronze: "#92400E",
          peach: "#FDA085",
          rose: "#FB7185",
          ruby: "#E11D48",
          garnet: "#881337",
          velvet: "#1E0517",
          noir: "#0D0B0E",
          obsidian: "#141018",
          silk: "#FAF7F2",
          pearl: "#FDFCFA",
        },
      },
      boxShadow: {
        'glam-sm': '0 4px 14px 0 rgba(225, 29, 72, 0.12)',
        'glam': '0 10px 25px -5px rgba(225, 29, 72, 0.25), 0 8px 10px -6px rgba(225, 29, 72, 0.2)',
        'glam-gold': '0 10px 25px -5px rgba(217, 119, 6, 0.25), 0 8px 10px -6px rgba(217, 119, 6, 0.15)',
        'glam-lg': '0 20px 45px -10px rgba(15, 2, 11, 0.12)',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.05)',
        'glass-card': '0 10px 30px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)',
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
