/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/App.tsx",
    "./src/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          950: '#ffffff', // pure clean white background
          900: '#f8fafc', // clean off-white card/panel surface
          850: '#f1f5f9', // subtle nested wells
          800: '#e2e8f0', // crisp borders and dividers
          700: '#cbd5e1', // input borders and hover states
          600: '#94a3b8', // subtle text and secondary icons
          500: '#64748b', // readable muted labels and metadata
          400: '#475569', // readable secondary body text
          300: '#334155', // primary dark body text
          200: '#1e293b', // bold dark emphasized text
          100: '#0f172a', // crisp primary headings and titles
          50: '#020617',  // deepest contrast
        },
        teal: {
          400: '#0d9488', // legible high-contrast teal on white
          300: '#0f766e',
        },
        purple: {
          400: '#7c3aed', // legible purple on white
          300: '#6d28d9',
        },
        emerald: {
          400: '#059669', // legible emerald on white
          300: '#047857',
        },
        rose: {
          400: '#e11d48', // legible rose on white
          300: '#be123c',
        },
        cyan: {
          400: '#0891b2', // legible cyan on white
          300: '#0e7490',
        },
        sky: {
          400: '#0284c7', // legible sky blue on white
          300: '#0369a1',
        },
        amber: {
          400: '#d97706', // legible amber on white
          300: '#b45309',
        }
      }
    },
  },
  plugins: [],
}
